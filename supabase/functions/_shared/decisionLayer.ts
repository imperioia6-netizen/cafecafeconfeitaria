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
/**
 * SISTEMA MULTI-AGENTE: cada intent carrega SOMENTE as notas relevantes.
 * Prompt pequeno (~5K chars) = LLM segue TODAS as regras.
 *
 * Agente SAUDACAO: sistema/master + modelos/respostas + exemplos/saudacao
 * Agente BOLO: cardapio/bolos + sistema/regras-de-ouro + manual/verificacao
 * Agente SALGADO: cardapio/mini-salgados + cardapio/salgados + sistema/regras-de-ouro
 * Agente DOCE: cardapio/doces + sistema/regras-de-ouro
 * Agente DELIVERY: fluxos/fluxo-delivery + operacao/delivery + operacao/taxas
 * Agente ENCOMENDA: fluxos/fluxo-encomenda + operacao/encomenda
 * Agente RETIRADA: fluxos/fluxo-retirada + operacao/retirada
 * Agente PAGAMENTO: fluxos/fluxo-pix + operacao/formas-de-pagamento
 * Agente GERAL: sistema/master + sistema/regras-de-ouro + manual/verificacao
 */
const AGENT_NOTES: Record<string, string[]> = {
  greeting: ["sistema/master", "modelos/respostas", "exemplos/saudacao", "sistema/tom-de-voz"],
  cakes: ["cardapio/bolos", "sistema/regras-de-ouro", "manual/verificacao", "restricoes/erros-comuns"],
  cake_slice: ["cardapio/fatias", "sistema/regras-de-ouro"],
  mini_savories: ["cardapio/mini-salgados", "sistema/regras-de-ouro", "manual/verificacao"],
  savories: ["cardapio/salgados", "cardapio/mini-salgados", "sistema/regras-de-ouro"],
  sweets: ["cardapio/doces", "sistema/regras-de-ouro", "manual/verificacao"],
  drinks: ["cardapio/bebidas"],
  delivery: ["fluxos/fluxo-delivery", "operacao/delivery", "operacao/taxas", "sistema/regras-de-ouro"],
  delivery_fee: ["operacao/taxas", "fluxos/fluxo-taxa"],
  order_now: ["sistema/master", "fluxos/fluxo-pedido-completo", "modelos/perguntas", "sistema/regras-de-ouro", "manual/continuidade"],
  pre_order: ["fluxos/fluxo-encomenda", "operacao/encomenda", "sistema/regras-de-ouro", "modelos/perguntas", "manual/continuidade"],
  pricing: ["cardapio/bolos", "cardapio/mini-salgados", "cardapio/doces", "cardapio/bebidas"],
  payment: ["fluxos/fluxo-pix", "operacao/formas-de-pagamento", "operacao/pix", "manual/registro-pedido"],
  hours: ["operacao/horarios", "sistema/horario-sistema"],
  address: ["operacao/retirada"],
  exceptions: ["sistema/excecoes", "restricoes/erros-comuns"],
  order_status: ["operacao/status-pedido"],
  unknown: ["sistema/master", "sistema/regras-de-ouro", "sistema/tom-de-voz", "manual/verificacao"],
};

// Notas SEMPRE incluídas (core do comportamento)
const ALWAYS_INCLUDE = ["manual/interpretacao", "manual/continuidade"];

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
  // 1. Determinar quais notas carregar baseado no intent
  const agentNotes = AGENT_NOTES[intent] || AGENT_NOTES.unknown;
  const allPaths = [...new Set([...agentNotes, ...ALWAYS_INCLUDE])];

  // 2. Buscar SOMENTE as notas relevantes (~3-5K chars em vez de 37K)
  const { data: notasData, error } = await supabase
    .from("knowledge_base")
    .select("caminho, titulo, conteudo")
    .in("caminho", allPaths)
    .eq("ativa", true);

  if (error) console.error("fetchNotas error:", error.message);

  const notas = (notasData || []) as { caminho: string; titulo: string; conteudo: string }[];
  const notasRelevantes = notas
    .map((n) => `[${n.titulo}]\n${n.conteudo}`)
    .join("\n\n");

  console.log(`Agent[${intent}]: ${notas.length} notas, ${notasRelevantes.length} chars`);

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
  // SISTEMA MULTI-AGENTE: Prompt PEQUENO e FOCADO.
  // Cada intent carrega SOMENTE suas notas (~3-5K chars).
  // A LLM segue TUDO porque o prompt é curto.
  // ══════════════════════════════════════════════════════════════

  parts.push(`Voce e a atendente do Cafe Cafe Confeitaria no WhatsApp.
REGRAS ABSOLUTAS:
- Siga EXATAMENTE o que esta nas instrucoes abaixo.
- NUNCA mencione produtos de outra categoria (se fala de bolo, NAO cite salgados).
- NUNCA invente sabor, preco ou disponibilidade.
- Respostas CURTAS e diretas. Tom brasileiro natural.
- Responda SOMENTE com a mensagem para o cliente.`);

  // Vault focado (só notas do agente especializado)
  if (ctx.notasRelevantes) {
    parts.push(`\n${ctx.notasRelevantes}`);
  }

  // Instruções do proprietário
  if (ctx.customInstructions) {
    parts.push(`\n${ctx.customInstructions}`);
  }

  // Cálculos exatos (se houver)
  if (ctx.calculosTexto) {
    parts.push(`\n[Calculos]\n${ctx.calculosTexto}`);
  }

  // Alertas de regras
  if (ctx.alertas.length > 0) {
    parts.push(`\n[Alertas]\n${ctx.alertas.join("\n")}`);
  }

  // Cardápio filtrado (só categorias relevantes)
  if (ctx.cardapioDetalhado && ctx.cardapioDetalhado.length > 50) {
    parts.push(`\n[Precos Atuais]\n${ctx.cardapioDetalhado}`);
  }

  // Taxas (só se intent é delivery/taxa)
  if (ctx.deliveryZonesTexto && ["delivery", "delivery_fee", "order_now"].includes(ctx.intent)) {
    parts.push(`\n[Taxas Entrega]\n${ctx.deliveryZonesTexto}`);
  }

  // Dados do cliente
  parts.push(`\n[Cliente] Nome: ${ctx.contactName || "nao informado"}`);

  const prompt = parts.join("\n");
  console.log(`buildSmartPrompt[${ctx.intent}]: ${prompt.length} chars, notas=${ctx.notasRelevantes?.length || 0} chars`);
  return prompt;
}
