/**
 * decisionLayer.ts — Camada de decisão que orquestra tudo.
 *
 * ARQUITETURA:
 *
 *   WhatsApp → Webhook → decisionLayer → LLM → Resposta
 *
 * O que esta camada faz:
 * 1. Recebe a mensagem + intent + entities
 * 2. Usa o routeNotes para determinar QUAIS notas buscar
 * 3. Busca as notas do knowledge_base (Supabase)
 * 4. Pré-calcula valores (calculadora FORA da LLM)
 * 5. Monta um contexto PEQUENO e FOCADO para a LLM
 * 6. A LLM só faz: conversar + apresentar + conduzir
 *
 * Obsidian = memória e regras
 * LLM = raciocínio + conversa + condução
 * Automação = motor operacional (cálculos, validações)
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeNotes, type Intent, type Entities } from "./routeNotes.ts";
import {
  calcularBolo,
  calcularSalgados,
  calcularFatias,
  dividirBoloGrande,
  calcularEntrada,
  verificarHorarioFuncionamento,
  verificarHorarioDelivery,
  validarQuantidadeSalgados,
  type RecipeInfo,
} from "./calculator.ts";

// ── Tipos ──

export interface DecisionContext {
  /** Notas do knowledge_base relevantes (conteúdo markdown) */
  notasRelevantes: string;
  /** Cálculos pré-feitos (se houver) */
  calculosTexto: string;
  /** Alertas e validações (se houver) */
  alertas: string[];
  /** Dados de pagamento do CRM */
  paymentInfo: string;
  /** Instruções custom do proprietário */
  customInstructions: string;
  /** Cardápio dinâmico (do banco de recipes) */
  cardapioDetalhado: string;
  /** Zonas de delivery com disponibilidade */
  deliveryZonesTexto: string;
  /** Promoções ativas */
  promoSummary: string;
  /** Dados do açaí */
  cardapioAcai: string;
  /** Nomes exatos dos produtos (para registro) */
  cardapioNomes: string;
  /** Nome do contato */
  contactName: string;
  /** Intent detectada */
  intent: Intent;
}

// ── Detector de entidades ──

/**
 * Detecta entidades na mensagem do cliente.
 * Complementa o intent com informações específicas.
 */
export function detectEntities(message: string): Entities {
  const msg = message.toLowerCase();

  return {
    mentionsCake: /\b(bolo|bolos)\b/i.test(msg),
    mentionsSlice: /\b(fatia|fatias|peda[cç]o)\b/i.test(msg),
    mentionsMiniSavory: /\b(mini\s*salgad|mini\s*coxinha|mini\s*kibe|mini\s*quibe|mini\s*risoles)\b/i.test(msg),
    mentionsSavory: /\b(salgad[oa]s?|coxinha|kibe|quibe|risoles|empada|pastel|bolinha)\b/i.test(msg) && !/\bmini\b/i.test(msg),
    mentionsSweets: /\b(doce|doces|docinhos?|brigadeiro|beijinho|cajuzinho|olho.de.sogra)\b/i.test(msg),
    mentionsDrink: /\b(caf[eé]|suco|bebida|refrigerante|[aá]gua|ch[aá])\b/i.test(msg),
    mentionsDelivery: /\b(delivery|entrega|entreg[ao]|manda|enviar?|levar?)\b/i.test(msg),
    mentionsPickup: /\b(retir[ao]|buscar|busc[ao]|retirar|pegar|loja)\b/i.test(msg),
    mentionsPayment: /\b(pix|pagamento|pagar|comprovante|transferi|cart[aã]o|dinheiro)\b/i.test(msg),
    mentionsNeighborhood: extractNeighborhood(msg),
    mentionsCustomCake: /\b(personaliz|papel.de.arroz|foto.no.bolo|bolo.fake)\b/i.test(msg),
  };
}

/**
 * Tenta extrair o nome do bairro da mensagem.
 */
function extractNeighborhood(msg: string): string | null {
  // Padrões comuns: "moro no Centro", "entrega no Jaguaré", "bairro Vila Yara"
  const patterns = [
    /(?:moro|fico|sou)\s+(?:no|na|do|da|em)\s+([A-ZÀ-Ú][\w\sÀ-ú]+)/i,
    /(?:entrega|delivery)\s+(?:no|na|pra|para|pro|em)\s+([A-ZÀ-Ú][\w\sÀ-ú]+)/i,
    /bairro\s+([A-ZÀ-Ú][\w\sÀ-ú]+)/i,
  ];

  for (const pattern of patterns) {
    const match = msg.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

// ── Busca de notas ──

interface KBRow {
  caminho: string;
  titulo: string;
  conteudo: string;
}

/**
 * Busca notas do knowledge_base por caminhos.
 */
async function fetchNotas(
  supabase: SupabaseClient,
  caminhos: string[]
): Promise<KBRow[]> {
  if (caminhos.length === 0) return [];

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("caminho, titulo, conteudo")
    .in("caminho", caminhos)
    .eq("ativa", true);

  if (error) {
    console.error("fetchNotas error:", error.message);
    return [];
  }

  return (data || []) as KBRow[];
}

/**
 * Busca TODAS as notas ativas do knowledge_base.
 * O Vault inteiro vira a memória do agente — sem roteamento, sem gargalo.
 * ~30K chars (~8K tokens) = cabe tranquilo no gpt-4o (128K tokens).
 */
export async function fetchAllNotas(
  supabase: SupabaseClient
): Promise<KBRow[]> {
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("caminho, titulo, conteudo")
    .eq("ativa", true)
    .order("caminho");

  if (error) {
    console.error("fetchAllNotas error:", error.message);
    return [];
  }

  return (data || []) as KBRow[];
}

// ── Pré-cálculo ──

interface PreCalcResult {
  texto: string;
  alertas: string[];
}

/**
 * Pré-calcula TODOS os valores da mensagem. A LLM NÃO faz contas — recebe valores prontos.
 * Cobre: bolos (com/sem peso), meio a meio, múltiplos bolos, salgados, docinhos, fatias,
 * decoração, total combinado, sinal 50%, regras de negócio.
 */
function preCalcular(
  message: string,
  intent: Intent,
  entities: Entities,
  recipes: RecipeInfo[]
): PreCalcResult {
  const calculos: string[] = [];
  const alertas: string[] = [];
  let totalGeral = 0;
  let temSalgados = false;

  const msgLower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // ════════ DETECÇÃO DE PESO QUEBRADO (5,5kg etc) ════════
  const pesoQuebradoMatch = msgLower.match(/(\d+)[,.](\d+)\s*kg/);
  if (pesoQuebradoMatch) {
    const pesoOriginal = `${pesoQuebradoMatch[1]},${pesoQuebradoMatch[2]}`;
    const pesoInt = parseInt(pesoQuebradoMatch[1]);
    const proximoInteiro = pesoInt + 1;
    alertas.push(`[REGRA] Cliente pediu ${pesoOriginal}kg. NAO fazemos peso quebrado. So kg inteiro: 1, 2, 3, 4. Sugerir ${pesoInt}kg ou ${proximoInteiro}kg. Se >4kg, dividir em formas (ex: 6kg = 4+2).`);
  }

  // ════════ BOLOS COM PESO ════════
  // Padrões: "bolo de brigadeiro de 2kg", "2kg de brigadeiro", "bolo brigadeiro 3kg"
  const boloPatterns = [
    /(?:bolo\s+(?:de\s+)?)([\w\sà-ú]+?)(?:\s+(?:de\s+)?(\d+)\s*kg)/gi,
    /(\d+)\s*kg\s+(?:de\s+)?(?:bolo\s+(?:de\s+)?)?([\w\sà-ú]+?)(?:\s|$|,|\.)/gi,
  ];
  const bolosDetectados: { sabor: string; peso: number; valor: number }[] = [];

  // Se peso quebrado foi detectado, não calcular com o parseInt errado
  if (pesoQuebradoMatch) {
    // Não processar bolos — peso inválido, alertas já foram adicionados
  } else
  for (const pattern of boloPatterns) {
    let match;
    while ((match = pattern.exec(msgLower)) !== null) {
      const sabor = (pattern === boloPatterns[0] ? match[1] : match[2]).trim();
      const peso = parseInt(pattern === boloPatterns[0] ? match[2] : match[1]);
      if (!sabor || !peso || peso <= 0 || peso > 20) continue;

      // Dividir se >4kg
      if (peso > 4) {
        const formas = dividirBoloGrande(peso);
        calculos.push(`[CALCULO] Bolo ${peso}kg → dividir em ${formas.length} formas: ${formas.map(f => `${f}kg`).join(" + ")} (limite 4kg/forma)`);
      }

      const resultado = calcularBolo(sabor, peso, recipes);
      if (resultado) {
        calculos.push(`[CALCULO] Bolo ${sabor} ${peso}kg: R$${resultado.precoKg.toFixed(2)}/kg x ${peso}kg = R$${resultado.valor.toFixed(2)}`);
        bolosDetectados.push({ sabor, peso, valor: resultado.valor });
        totalGeral += resultado.valor;

        // Regra: delivery so ate 3kg
        if (peso > 3 && (entities.mentionsDelivery || msgLower.includes("entreg"))) {
          alertas.push(`[REGRA] Bolo ${peso}kg = SOMENTE retirada. Delivery ate 3kg.`);
        }
      }
    }
  }

  // ════════ BOLO SEM PESO (só sabor → mostrar tabela) ════════
  if (bolosDetectados.length === 0 && entities.mentionsCake) {
    const saborMatch = msgLower.match(/bolo\s+(?:de\s+)?([\w\sà-ú]+)/i);
    if (saborMatch) {
      const sabor = saborMatch[1].trim();
      const recipe = recipes.find(r => r.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(sabor));
      if (recipe && recipe.sale_price) {
        const p = Number(recipe.sale_price);
        calculos.push(`[REFERENCIA] Bolo ${recipe.name}: R$${p.toFixed(2)}/kg → 1kg=R$${p.toFixed(2)}, 2kg=R$${(p*2).toFixed(2)}, 3kg=R$${(p*3).toFixed(2)}, 4kg=R$${(p*4).toFixed(2)}`);
      }
    }
  }

  // ════════ BOLO MEIO A MEIO ════════
  const meioMatch = msgLower.match(/meio\s+a\s+meio|metade\s+(?:de\s+)?cada/i);
  if (meioMatch) {
    const pesoMatch = msgLower.match(/(\d+)\s*kg/);
    const peso = pesoMatch ? parseInt(pesoMatch[1]) : 0;
    if (peso === 1) {
      alertas.push(`[REGRA] Bolo meio a meio de 1kg NAO e possivel. Somente a partir de 2kg.`);
    } else if (peso >= 2) {
      calculos.push(`[CALCULO] Meio a meio ${peso}kg: peso dividido igualmente (${peso/2}kg de cada). Valor = sabor MAIS CARO x ${peso}kg.`);
    }
  }

  // ════════ MINI SALGADOS ════════
  const salgadosMatches = [...msgLower.matchAll(/(\d+)\s*(?:unidades?\s+(?:de\s+)?)?(?:mini\s+)?(?:salgad|coxinha|kibe|quibe|risoles|bolinha|empada|esfiha|enrolado)/gi)];
  for (const sMatch of salgadosMatches) {
    const qtd = parseInt(sMatch[1]);
    if (!qtd || qtd <= 0) continue;
    temSalgados = true;
    const validacao = validarQuantidadeSalgados(qtd);
    if (!validacao.valido) {
      alertas.push(`[REGRA] ${qtd} salgados nao e multiplo de 25. Sugestoes: ${validacao.sugestaoInferior} ou ${validacao.sugestaoSuperior}.`);
    }
    const resultado = calcularSalgados(qtd);
    calculos.push(`[CALCULO] ${qtd} mini salgados: R$${resultado.valor.toFixed(2)} (R$175/cento)`);
    totalGeral += resultado.valor;
  }

  // ════════ DOCINHOS ════════
  const docinhoMatch = msgLower.match(/(\d+)\s*(?:unidades?\s+(?:de\s+)?)?(?:docinhos?|brigadeiros?|beijinhos?|cajuzinhos?|bicho\s*de\s*pe|olho\s*de\s*sogra)/i);
  if (docinhoMatch) {
    const qtd = parseInt(docinhoMatch[1]);
    if (qtd > 0) {
      if (qtd % 25 !== 0) {
        alertas.push(`[REGRA] ${qtd} docinhos nao e multiplo de 25.`);
      }
      const valor = qtd * 1.90;
      calculos.push(`[CALCULO] ${qtd} docinhos: ${qtd} x R$1,90 = R$${valor.toFixed(2)}`);
      totalGeral += valor;
    }
  }

  // ════════ FATIAS ════════
  const fatiaMatch = msgLower.match(/(\d+)\s*(?:fatias?|pedacos?|peda[cç]os?)/i);
  if (fatiaMatch) {
    const qtd = parseInt(fatiaMatch[1]);
    if (qtd > 0) {
      const valor = qtd * 25;
      calculos.push(`[CALCULO] ${qtd} fatia(s): ${qtd} x R$25 = R$${valor.toFixed(2)}`);
      totalGeral += valor;
      alertas.push(`[VITRINE] Fatias sao da vitrine — CONSULTAR equipe quais sabores tem hoje.`);
    }
  }

  // ════════ DECORAÇÃO ════════
  if (msgLower.includes("decoracao") || msgLower.includes("decorar") || msgLower.includes("decorado")) {
    if (msgLower.includes("colorida") || msgLower.includes("cor")) {
      calculos.push(`[CALCULO] Decoracao colorida: +R$25,00`);
      totalGeral += 25;
    } else if (msgLower.includes("escrita") || msgLower.includes("personalizada") || msgLower.includes("escrever")) {
      calculos.push(`[CALCULO] Escrita personalizada: +R$15,00`);
      totalGeral += 15;
    } else if (msgLower.includes("papel de arroz") || msgLower.includes("arroz")) {
      calculos.push(`[CALCULO] Papel de arroz (cliente traz): +R$25,00`);
      totalGeral += 25;
    } else {
      calculos.push(`[INFO] Cliente quer decoracao — perguntar tipo: escrita (R$15), colorida (R$25) ou papel de arroz (R$25, cliente traz).`);
    }
  }

  // ════════ TOTAL COMBINADO ════════
  if (totalGeral > 0 && calculos.length > 1) {
    calculos.push(`[TOTAL] Subtotal dos itens: R$${totalGeral.toFixed(2)}`);

    // Sinal 50%
    if (temSalgados) {
      calculos.push(`[SINAL] Salgados = SEMPRE 50% de sinal: R$${(totalGeral * 0.5).toFixed(2)}`);
    } else if (totalGeral > 300) {
      const sinal = Math.ceil(totalGeral * 0.5 * 100) / 100;
      calculos.push(`[SINAL] Total > R$300 → sinal 50%: R$${sinal.toFixed(2)}`);
    }
  } else if (totalGeral > 0) {
    // Item único — checar sinal
    if (temSalgados) {
      calculos.push(`[SINAL] Salgados = SEMPRE 50% de sinal: R$${(totalGeral * 0.5).toFixed(2)}`);
    } else if (totalGeral > 300) {
      const sinal = Math.ceil(totalGeral * 0.5 * 100) / 100;
      calculos.push(`[SINAL] Total > R$300 → sinal 50%: R$${sinal.toFixed(2)}`);
    }
  }

  // ════════ VERIFICAÇÕES DE HORÁRIO ════════
  const horario = verificarHorarioFuncionamento();
  if (!horario.aberto) {
    alertas.push(`[HORARIO] ${horario.mensagem}`);
  }
  if (entities.mentionsDelivery || intent === "delivery" || intent === "delivery_fee") {
    const deliveryHorario = verificarHorarioDelivery();
    if (!deliveryHorario.disponivel) {
      alertas.push(`[DELIVERY] ${deliveryHorario.mensagem}`);
    }
  }

  // ════════ BAIRRO ════════
  if (entities.mentionsNeighborhood) {
    calculos.push(`[INFO] Bairro mencionado: ${entities.mentionsNeighborhood} → verificar taxa na tabela.`);
  }

  // ════════ MINI COXINHA COM CATUPIRY ════════
  if (msgLower.includes("mini") && msgLower.includes("coxinha") && msgLower.includes("catupiry")) {
    alertas.push(`[REGRA] Mini coxinha NAO tem catupiry. Coxinha com catupiry so no tamanho normal (R$15).`);
  }

  return {
    texto: calculos.length > 0 ? calculos.join("\n") : "",
    alertas,
  };
}

// ── Montagem do contexto final ──

/**
 * Executa toda a camada de decisão e retorna o contexto
 * pronto para ser injetado no prompt da LLM.
 */
export async function buildDecisionContext(
  supabase: SupabaseClient,
  message: string,
  intent: Intent,
  entities: Entities,
  contactName: string,
  paymentInfo: string,
  customInstructions: string,
  promoSummary: string,
  cardapioAcai: string,
  cardapioDetalhado: string,
  cardapioNomes: string,
  deliveryZonesTexto: string,
  recipes: RecipeInfo[]
): Promise<DecisionContext> {
  // 1. Buscar TODAS as notas do Vault — é a ÚNICA fonte de conhecimento do agente
  // A LLM não sabe NADA sozinha. Tudo vem do Vault.
  // 30K chars + cardápio filtrado (~3K) = ~33K chars = ~8K tokens (6% do gpt-4o)
  const notas = await fetchAllNotas(supabase);
  const notasRelevantes = notas
    .map((n) => `[${n.titulo}]\n${n.conteudo}`)
    .join("\n\n");

  // 3. Pré-calcular valores (FORA da LLM)
  const preCalc = preCalcular(message, intent, entities, recipes);

  return {
    notasRelevantes,
    calculosTexto: preCalc.texto,
    alertas: preCalc.alertas,
    paymentInfo,
    customInstructions,
    cardapioDetalhado,
    deliveryZonesTexto,
    promoSummary,
    cardapioAcai,
    cardapioNomes,
    contactName,
    intent,
  };
}

/**
 * Monta o system prompt final.
 *
 * PROMPT ENXUTO:
 * - Identidade mínima (6 linhas)
 * - Notas relevantes do knowledge_base (só as necessárias)
 * - Cálculos pré-feitos (exatos)
 * - Cardápio (fonte de verdade)
 * - Dados do cliente
 * - Lembrete final
 */
export function buildSmartPrompt(ctx: DecisionContext): string {
  const parts: string[] = [];

  // ══════════════════════════════════════════════════════════════
  // A LLM NÃO SABE NADA SOZINHA. Todo conhecimento vem do VAULT.
  // Estrutura: Instrução mínima → Vault completo → Dados tempo real → Mensagem
  // ══════════════════════════════════════════════════════════════

  // Instrução MÍNIMA (só diz pra ler o Vault)
  parts.push(`Voce e a atendente virtual do Cafe Cafe Confeitaria no WhatsApp.
Voce NAO sabe nada sozinha. TODO seu conhecimento esta no VAULT abaixo.
Siga EXATAMENTE o que esta no Vault. Se nao esta no Vault, voce nao sabe.
Responda SOMENTE com a mensagem para o cliente. Sem tags internas.`);

  // VAULT COMPLETO — a memória total do agente
  if (ctx.notasRelevantes) {
    parts.push(`\n${ctx.notasRelevantes}`);
  }

  // Instruções do proprietário (complementa o Vault)
  if (ctx.customInstructions) {
    parts.push(`\n[Instrucoes do Proprietario]\n${ctx.customInstructions}`);
  }

  // Cálculos pré-feitos (valores exatos — use estes, não calcule)
  if (ctx.calculosTexto) {
    parts.push(`\n[Calculos Exatos]\n${ctx.calculosTexto}`);
  }

  // Alertas (regras violadas detectadas na mensagem)
  if (ctx.alertas.length > 0) {
    parts.push(`\n[Alertas]\n${ctx.alertas.join("\n")}`);
  }

  // Cardápio com preços em tempo real (só categorias relevantes)
  if (ctx.cardapioAcai) {
    parts.push(`\n[Acai - Precos]\n${ctx.cardapioAcai}`);
  }
  if (ctx.cardapioDetalhado) {
    parts.push(`\n[Cardapio - Precos Atuais]\n${ctx.cardapioDetalhado}`);
  }

  // Taxas de entrega (só se relevante)
  if (ctx.deliveryZonesTexto) {
    parts.push(`\n[Taxas Entrega]\n${ctx.deliveryZonesTexto}`);
  }

  // Dados do cliente
  parts.push(`\n[Cliente]\nNome: ${ctx.contactName || "nao informado"}\nPagamento: ${ctx.paymentInfo}`);

  const prompt = parts.join("\n");
  console.log(`buildSmartPrompt: ${prompt.length} chars, vault=${ctx.notasRelevantes?.length || 0} chars`);
  return prompt;
}
