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
  calcularBoloMeioAMeio,
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
    mentionsDrink: /\b(suco|bebida|refrigerante|[aá]gua mineral|ch[aá] gelado)\b/i.test(msg) || (/\b(caf[eé])\b/i.test(msg) && !/caf[eé]\s*caf[eé]/i.test(msg)),
    mentionsDelivery: /\b(delivery|entrega|entreg[ao]|manda|enviar?|levar?)\b/i.test(msg),
    mentionsPickup: /\b(retir[ao]|buscar|busc[ao]|retirar|pegar|loja)\b/i.test(msg),
    mentionsPayment: /\b(pix|pagamento|pagar|comprovante|transferi|cart[aã]o|dinheiro)\b/i.test(msg),
    mentionsNeighborhood: extractNeighborhood(msg),
    mentionsCustomCake: /\b(personaliz|papel.de.arroz|foto.no.bolo|bolo.fake|decorac|decorar|decorado|homem.aranha|princesa|patrulha|frozen|minnie|mickey|aranha|super.her[oó]i|tema|tem[aá]tic|colorid|chantininho|topo.de.bolo|pasta.americana)\b/i.test(msg),
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

// ── Pré-cálculo ──

interface PreCalcResult {
  texto: string;
  alertas: string[];
}

/**
 * Pré-calcula valores da mensagem. A LLM NÃO faz contas — recebe valores prontos.
 */
function preCalcular(
  message: string,
  intent: Intent,
  entities: Entities,
  recipes: RecipeInfo[]
): PreCalcResult {
  const calculos: string[] = [];
  const alertas: string[] = [];

  // Só calcular se faz sentido
  const deveCalcular = [
    "cakes", "cake_slice", "mini_savories", "savories", "sweets",
    "drinks", "pricing", "order_now", "pre_order", "delivery", "delivery_fee"
  ].includes(intent);

  if (!deveCalcular && !entities.mentionsCake && !entities.mentionsMiniSavory && !entities.mentionsSlice) {
    return { texto: "", alertas };
  }

  const msgLower = message.toLowerCase();

  // ── Detectar kg quebrado (antes de tudo) ──
  const kgQuebraMatch = msgLower.match(/(\d+)[.,](\d+)\s*kg/i);
  if (kgQuebraMatch) {
    const pesoQuebrado = parseFloat(`${kgQuebraMatch[1]}.${kgQuebraMatch[2]}`);
    const pesoInferior = Math.floor(pesoQuebrado);
    const pesoSuperior = Math.ceil(pesoQuebrado);
    alertas.push(
      `[KG_QUEBRADO] Cliente pediu ${pesoQuebrado}kg, mas só trabalhamos com kg INTEIRO. Informe: "A gente trabalha com peso inteiro. Quer que seja de ${pesoInferior}kg ou ${pesoSuperior}kg?" NÃO calcule valor para kg quebrado. NÃO prossiga sem resolver isso.`
    );
    return { texto: "", alertas };
  }

  // ── Detectar bolo meio a meio ──
  const meioAMeioMatch = msgLower.match(
    /meio\s*a\s*meio.*?([\w\sà-ú]+?)\s+(?:e|com)\s+([\w\sà-ú]+?)(?:\s+(?:de\s+)?(\d+)\s*kg)/i
  ) || msgLower.match(
    /(?:bolo\s+(?:de\s+)?)([\w\sà-ú]+?)\s+(?:e|com)\s+([\w\sà-ú]+?)(?:\s+(?:de\s+)?(\d+)\s*kg).*?meio\s*a\s*meio/i
  );
  if (meioAMeioMatch) {
    const sabor1 = meioAMeioMatch[1].trim();
    const sabor2 = meioAMeioMatch[2].trim();
    const peso = parseInt(meioAMeioMatch[3]);
    const resultado = calcularBoloMeioAMeio(sabor1, sabor2, peso, recipes);
    if (resultado) {
      calculos.push(
        `[CÁLCULO MEIO A MEIO] Bolo ${sabor1} + ${sabor2} (${peso}kg): usa o MAIOR preço = R$${resultado.precoKg}/kg × ${peso}kg = R$${resultado.valor.toFixed(2)} (sabor mais caro: ${resultado.saborMaisCaro})`
      );
      const entrada = calcularEntrada(resultado.valor);
      if (entrada.precisaEntrada) {
        calculos.push(
          `[CÁLCULO] Total > R$300 → entrada 50%: R$${entrada.valorEntrada.toFixed(2)}`
        );
      }
    }
  }

  // ── Detectar bolo com peso ──
  const boloMatch = !meioAMeioMatch ? msgLower.match(
    /(?:bolo\s+(?:de\s+)?)([\w\sà-ú]+?)(?:\s+(?:de\s+)?(\d+)\s*kg)/i
  ) : null;
  if (boloMatch) {
    const sabor = boloMatch[1].trim();
    const peso = parseInt(boloMatch[2]);

    if (peso > 4) {
      const formas = dividirBoloGrande(peso);
      calculos.push(
        `[CÁLCULO] Bolo de ${peso}kg → dividir em ${formas.length} formas: ${formas.map((f) => `${f}kg`).join(" + ")}`
      );
    }

    const resultado = calcularBolo(sabor, peso, recipes);
    if (resultado) {
      calculos.push(
        `[CÁLCULO] Bolo ${sabor} ${peso}kg: R$${resultado.precoKg}/kg × ${peso}kg = R$${resultado.valor.toFixed(2)}`
      );
      const entrada = calcularEntrada(resultado.valor);
      if (entrada.precisaEntrada) {
        calculos.push(
          `[CÁLCULO] Total > R$300 → entrada 50%: R$${entrada.valorEntrada.toFixed(2)}`
        );
      }
    }
  }

  // ── Detectar bolo sem peso (só sabor) ──
  if (!boloMatch && entities.mentionsCake) {
    const saborMatch = msgLower.match(/bolo\s+(?:de\s+)?([\w\sà-ú]+)/i);
    if (saborMatch) {
      const sabor = saborMatch[1].trim();
      const precoKg = recipes.find(
        (r) => r.name.toLowerCase().includes(sabor)
      );
      if (precoKg && precoKg.sale_price) {
        calculos.push(
          `[REFERÊNCIA] Bolo ${sabor}: R$${Number(precoKg.sale_price).toFixed(2)}/kg (1kg=R$${Number(precoKg.sale_price).toFixed(2)}, 2kg=R$${(Number(precoKg.sale_price) * 2).toFixed(2)}, 3kg=R$${(Number(precoKg.sale_price) * 3).toFixed(2)}, 4kg=R$${(Number(precoKg.sale_price) * 4).toFixed(2)})`
        );
      }
    }
  }

  // ── Detectar salgados ──
  const salgadosMatch = msgLower.match(
    /(\d+)\s*(?:unidades?\s+(?:de\s+)?)?(?:mini\s+)?(?:salgad|coxinha|kibe|quibe|risoles)/i
  );
  if (salgadosMatch) {
    const qtd = parseInt(salgadosMatch[1]);
    const validacao = validarQuantidadeSalgados(qtd);
    if (!validacao.valido) {
      alertas.push(
        `[SALGADOS_QUANTIDADE_INVÁLIDA] ⛔ ATENÇÃO: Cliente pediu ${qtd} mini salgados, mas ${qtd} NÃO é múltiplo de 25. Os mini salgados são vendidos de 25 em 25 por sabor. VOCÊ DEVE informar ao cliente que não é possível fazer ${qtd} e sugerir: ${validacao.sugestaoInferior} ou ${validacao.sugestaoSuperior}. NÃO aceite nem calcule valor para ${qtd} unidades. NÃO prossiga sem resolver isso.`
      );
      // NÃO calcular valor para quantidade inválida
    } else {
      const resultado = calcularSalgados(qtd);
      calculos.push(
        `[CÁLCULO] ${qtd} mini salgados: R$${resultado.valor.toFixed(2)} (R$175/cento)`
      );
    }
  }

  // ── Detectar fatias ──
  const fatiaMatch = msgLower.match(/(\d+)\s*fatias?/i);
  if (fatiaMatch) {
    const qtd = parseInt(fatiaMatch[1]);
    const resultado = calcularFatias(qtd);
    calculos.push(
      `[CÁLCULO] ${qtd} fatia(s): ${qtd} × R$25 = R$${resultado.valor.toFixed(2)}`
    );
  }

  // ── Verificar horário ──
  const horario = verificarHorarioFuncionamento();
  if (!horario.aberto) {
    alertas.push(`[HORÁRIO] ${horario.mensagem}`);
  }

  // ── Verificar delivery ──
  if (entities.mentionsDelivery || intent === "delivery" || intent === "delivery_fee") {
    const deliveryHorario = verificarHorarioDelivery();
    if (!deliveryHorario.disponivel) {
      alertas.push(`[DELIVERY] ${deliveryHorario.mensagem}`);
    }
  }

  // ── Detectar decoração ──
  if (/\b(decorac[aã]o|decorar|decorado|personaliz|chantininho|topo|pasta\s*americana)\b/i.test(msgLower)) {
    calculos.push(`[CÁLCULO] Decoração/personalização: +R$30,00 (somar ao total)`);
  }

  // ── Bairro mencionado ──
  if (entities.mentionsNeighborhood) {
    calculos.push(
      `[INFO] Cliente mencionou bairro: ${entities.mentionsNeighborhood} → buscar taxa na tabela`
    );
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
  // 1. Rotear: quais notas buscar?
  const caminhos = routeNotes(intent, entities);

  // 2. Buscar notas do knowledge_base
  const notas = await fetchNotas(supabase, caminhos);
  const notasRelevantes = notas
    .map((n) => `═══ ${n.titulo.toUpperCase()} ═══\n${n.conteudo}`)
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

  // 1. Prompt fixo MÍNIMO — identidade + regras de ouro
  parts.push(`Você é a atendente virtual da Café Café Confeitaria, Osasco-SP.
Fale como pessoa real: "Boa!", "Anotado!", "Temos sim!", "Beleza!".

PROIBIDO ABSOLUTO:
- Começar mensagem com "Oi" ou "Oi! 😊" (EXCETO na primeiríssima saudação quando o cliente diz "Olá"/"Oi"). Depois da primeira troca, NUNCA mais comece com "Oi".
- "Claro!", "Certamente!", "Estou aqui para ajudar", "opções deliciosas", "Ótima escolha!", "Excelente escolha!"
- Listas com bullets (•/-/*)
- Repetir informações que o cliente já sabe
- INVENTAR preços, taxas ou produtos — use SOMENTE o que está no contexto abaixo

Respostas CURTAS (2-3 linhas máx). Uma pergunta por vez. Estilo WhatsApp. TEXTO CORRIDO, nunca bullets.
Se precisar citar sabores/preços, fale em texto: "A gente tem brigadeiro (R$102/kg), ninho com morango (R$137/kg)..."
Use SOMENTE informações do contexto abaixo. Nunca invente nada.
Use CÁLCULOS PRÉ-FEITOS quando disponíveis — são exatos.

REGRA ABSOLUTA DE TEXTO:
- NUNCA abrevie, resuma, picote ou corte frases. Use SEMPRE o texto COMPLETO e EXATO.
- Se está montando resumo do pedido, escreva a frase INTEIRA de cada item. NUNCA corte no meio.
- Se o cliente disse "Bolo Trufado 1kg com escrita Eu te amo", anote EXATAMENTE isso. Não escreva "Falta definir o sabor do." cortando a frase.
- Se uma informação está pendente, escreva a frase completa: "Falta definir o sabor do bolo de 4kg" e NÃO "Falta definir o sabor do ."

REGRA ABSOLUTA DO CARDÁPIO:
- ANTES de dizer que um sabor "não existe", PROCURE no cardápio abaixo LETRA POR LETRA.
- O sabor TRUFADO existe sim! (R$129/kg). Assim como Trufado Branco, Trufado Preto de Morango, etc.
- Se o cliente pedir um sabor, procure no cardápio. Se encontrar → aceite. Se NÃO encontrar → "Vou verificar com a equipe!"
- NUNCA diga "não temos esse sabor" sem ter CERTEZA ABSOLUTA que não está no cardápio.

═══ INFORMAÇÕES OPERACIONAIS FIXAS (DECORAR — NUNCA ERRAR) ═══

HORÁRIO DE FUNCIONAMENTO:
- Loja: 07:30 às 19:30, segunda a sábado. Domingo FECHADO.
- Delivery: a partir das 09:00.
- NÃO diga que abrimos às 9h ou fechamos às 18h. O CORRETO é 07:30 às 19:30.

DECORAÇÃO DE BOLO (REGRA CRÍTICA — NÃO ERRAR!):
- SIM, fazemos decoração! Temos 3 tipos:
  1. Decoração COLORIDA (temas): R$30,00 — quando o cliente pedir qualquer TEMA (Homem Aranha, Princesa, Patrulha Canina, Frozen, futebol, flores, etc.), isso É decoração colorida. ACEITE e informe +R$30.
  2. Escrita personalizada: R$15,00 — texto no bolo ("Feliz Aniversário", "Eu te amo", etc.)
  3. Papel de arroz: R$30,00 — NÃO FAZEMOS papel de arroz. Se o cliente QUISER papel de arroz, ele precisa TRAZER DE CASA a arte impressa pronta. A gente só coloca no bolo e cobra R$30.
- NUNCA diga "não fazemos decoração de personagem" ou "não fazemos decoração temática". Quando o cliente pede um tema específico, ele está pedindo DECORAÇÃO COLORIDA.
- Anotar EXATAMENTE a descrição da decoração que o cliente pedir (sem resumir, sem picotar, sem inventar).

ENTREGA DE ENCOMENDAS:
- SIM, fazemos entrega de encomendas via delivery.
- O cliente pode ESCOLHER entre retirada na loja OU entrega (delivery).
- NUNCA diga que "só fazemos retirada" ou que "não entregamos encomendas".
- Se for delivery, SEMPRE pergunte o endereço de entrega e consulte a taxa.
- ⛔ EXCEÇÃO ABSOLUTA: BOLO DE 4KG NÃO FAZ DELIVERY! Bolo de 4kg = SOMENTE RETIRADA. Se o pedido contém bolo de 4kg, NÃO pergunte "retirada ou entrega?", diga DIRETO: "Bolo de 4kg é somente para retirada! 😊". Se cliente insistir em delivery → dividir em 2x2kg OU manter 4kg retirada.
- Se o pedido tem bolo de 4kg + outros itens = TUDO retirada (por causa do 4kg).

SALGADOS AVULSOS (TAMANHO NORMAL):
- SIM, vendemos salgados avulsos no tamanho normal (coxinha R$13, coxinha com catupiry R$15, kibe R$15, etc.)
- O pedido mínimo para DELIVERY é R$50,00 em produtos.
- NUNCA diga que "não vendemos coxinha avulsa" ou que "só vendemos por encomenda".
- Mini salgados SIM são apenas por encomenda (cento), mas salgados NORMAIS são vendidos avulsos.

MINI SALGADOS (ENCOMENDA):
- Vendidos em CENTO (100 unidades). Preço: R$175,00 o cento.
- Cada SABOR deve ser múltiplo de 25 (25, 50, 75, 100).
- O TOTAL também deve ser múltiplo de 25.
- Se o cliente pedir 115, 10, 5, ou qualquer número que NÃO é múltiplo de 25, RECUSE e explique: "Os mini salgados são vendidos de 25 em 25 por sabor. Quer ajustar pra 100 ou 125?"
- Mini coxinha com catupiry NÃO EXISTE. Apenas mini coxinha normal (frango).

ENDEREÇO — REGRA OBRIGATÓRIA:
- Se o pedido for DELIVERY ou ENTREGA, SEMPRE pergunte o endereço ANTES de fechar o pedido.
- NUNCA finalize um pedido de delivery sem ter o endereço completo.

═══ FIM DAS INFORMAÇÕES OPERACIONAIS FIXAS ═══

REGRAS CRÍTICAS DE FLUXO:
1. ANTES de responder: releia TODO o histórico. NUNCA esqueça item do pedido. NUNCA repita pergunta já respondida.
2. IDENTIFIQUE O TÓPICO ATUAL: se o cliente está falando de SALGADOS, responda sobre SALGADOS. Se está falando de BOLO, responda sobre BOLO. NUNCA confunda os dois.
3. Quando o cliente pedir algo que NÃO está no cardápio: PRIMEIRO procure BEM no cardápio (sabores como Trufado, Trufado Branco, Ninho, etc. EXISTEM!). Só se realmente NÃO encontrar: "Esse a gente não tem no cardápio, vou verificar com a equipe se é possível fazer! 😊"
4. ⛔ OBRIGATÓRIO — PERGUNTAR "DESEJA MAIS ALGUMA COISA?": Depois de anotar/confirmar item(s) do pedido, SEMPRE pergunte "Deseja mais alguma coisa?" ou "Quer adicionar algo mais?". NÃO pule para finalização, cálculo de total, pedido de endereço ou Pix sem ANTES perguntar se o cliente quer mais algo. Isso é OBRIGATÓRIO em 100% dos casos. SÓ finalize quando o cliente disser "não", "só isso", "é isso", "nada mais".
5. KG INTEIRO: Só trabalhamos com peso inteiro (1kg, 2kg, 3kg, 4kg). Se o cliente pedir kg quebrado (ex: 3,5kg), informe que só fazemos kg inteiro e pergunte se quer arredondar pra cima ou pra baixo.
6. Quando o pedido tiver MÚLTIPLOS ITENS (bolo + salgados + bebidas), mantenha ABSOLUTAMENTE TODOS na memória. Ao resumir ou calcular o total, INCLUA CADA ITEM sem exceção. Se esquecer um item, o erro é GRAVÍSSIMO.
7. Se o cliente ALTERAR o pedido (mudar peso do bolo, adicionar/remover item), RECALCULE o total inteiro e envie o novo resumo completo com TODOS os itens e o novo valor.
8. NUNCA invente preços. Se o preço não está no contexto, diga "Vou verificar o valor com a equipe!".
9. GUARDE todas as informações da conversa: se o cliente disse que é encomenda no início, NÃO pergunte de novo depois. Se disse que é delivery, NÃO pergunte se é retirada.
10. Ao fechar o pedido, liste CADA item com seu valor INDIVIDUAL e depois o TOTAL. Verifique se TODOS os itens mencionados estão na lista.
11. ⛔ BOLO DE 4KG = SOMENTE RETIRADA! Se o pedido tem bolo de 4kg, NÃO pergunte "retirada ou entrega?", NÃO peça endereço/CEP. Diga DIRETO: "Bolo de 4kg é somente para retirada! 😊". Se o pedido tem 4kg + outros itens = TUDO retirada.
12. ⛔ NUNCA PICOTAR FRASES: Ao montar resumo do pedido, escreva frases COMPLETAS. Se falta informação, diga claramente O QUE falta com frase completa: "Falta definir o sabor do bolo de 4kg" e NÃO "Falta definir o sabor do ."`);

  // 2. Notas relevantes do knowledge_base (Obsidian)
  if (ctx.notasRelevantes) {
    parts.push(`\n${ctx.notasRelevantes}`);
  }

  // 3. Cálculos pré-feitos (A LLM DEVE usar estes valores)
  if (ctx.calculosTexto) {
    parts.push(`\n═══ CÁLCULOS PRÉ-FEITOS (USE ESTES VALORES — SÃO EXATOS) ═══\n${ctx.calculosTexto}`);
  }

  // 4. Alertas
  if (ctx.alertas.length > 0) {
    parts.push(`\n═══ ALERTAS ═══\n${ctx.alertas.join("\n")}`);
  }

  // 5. Instruções do proprietário
  if (ctx.customInstructions) {
    parts.push(`\n═══ INSTRUÇÕES DO PROPRIETÁRIO (PRIORIDADE MÁXIMA) ═══\n${ctx.customInstructions}`);
  }

  // 6. Açaí (quando relevante)
  const needsAcai = ["cakes", "cake_slice", "pricing", "order_now", "pre_order", "drinks"].includes(ctx.intent);
  if (ctx.cardapioAcai && needsAcai) {
    parts.push(`\n═══ AÇAÍ ═══\n${ctx.cardapioAcai}`);
  }

  // 7. Cardápio detalhado (fonte de verdade) — incluir para qualquer intent que possa envolver produtos
  const needsMenu = ["cakes", "cake_slice", "mini_savories", "savories", "sweets", "drinks", "pricing", "order_now", "pre_order", "delivery", "unknown"].includes(ctx.intent);
  if (ctx.cardapioDetalhado && needsMenu) {
    parts.push(`\n═══ CARDÁPIO E PREÇOS (FONTE DE VERDADE) ═══\n${ctx.cardapioDetalhado}\n⚠️ Se NÃO está aqui, NÃO EXISTE. NUNCA invente preços.`);
  }

  // 8. Zonas de delivery — incluir em mais intents
  const needsDelivery = ["delivery", "delivery_fee", "order_now", "pre_order", "savories", "cakes", "mini_savories"].includes(ctx.intent);
  if (ctx.deliveryZonesTexto && needsDelivery) {
    parts.push(`\n═══ TAXAS DE ENTREGA ═══\n${ctx.deliveryZonesTexto}`);
  }

  // 9. Dados do cliente
  parts.push(`\n═══ DADOS DO CLIENTE ═══
Nome: ${ctx.contactName || "não informado"}
Promoções: ${ctx.promoSummary || "nenhuma"}
Pagamento: ${ctx.paymentInfo}
Cardápio PDF: http://bit.ly/3OYW9Fw`);

  // 10. Nomes para registro (quando relevante)
  if (ctx.cardapioNomes && ["order_now", "pre_order", "payment"].includes(ctx.intent)) {
    parts.push(`\n⚠️ Nomes exatos para registro: ${ctx.cardapioNomes}`);
  }

  // 11. Lembrete final (LLMs prestam mais atenção no fim do prompt)
  parts.push(`\n═══ CHECKLIST OBRIGATÓRIO (ANTES DE RESPONDER) ═══
1. Reli TODO o histórico? TODOS os itens confirmados estão no meu resumo? Se esqueci algum item é ERRO GRAVE.
2. O cliente já respondeu essa pergunta antes? Se sim, NÃO pergunte de novo.
3. Estou respondendo EXATAMENTE o que foi perguntado? Sem misturar assuntos?
4. Minha resposta tem no máximo 2-3 linhas? Sem textão?
5. Usei linguagem natural? Sem "Claro!", "Certamente!", "opções deliciosas"?
6. Se cliente pediu cardápio → mandei o LINK (http://bit.ly/3OYW9Fw)?
7. NÃO estou começando com "Oi" ou "Oi! 😊"? (só na primeira saudação!)
8. Se o cliente está falando de SALGADOS, estou respondendo sobre SALGADOS (e não bolos)?
9. O sabor que o cliente pediu REALMENTE não está no cardápio? PROCUREI BEM? (Trufado EXISTE! Ninho EXISTE! etc.)
10. ⛔ Perguntei "DESEJA MAIS ALGUMA COISA?" antes de finalizar/calcular total/pedir endereço/enviar Pix? Se NÃO perguntei, PERGUNTAR AGORA!
11. Os PREÇOS que estou informando estão EXATAMENTE no cardápio/contexto?
12. Se é delivery → já pedi o ENDEREÇO? Se não pedi, PERGUNTAR. MAS se tem bolo 4kg → NÃO pedir endereço, é RETIRADA!
13. ⛔ O pedido tem bolo de 4kg? Se SIM → é SOMENTE RETIRADA! NÃO pergunte "entrega ou retirada?" NÃO peça endereço/CEP!
14. Se o cliente ALTEROU o pedido → recalculei o TOTAL com TODOS os itens?
15. Sobre decoração: Temas (Homem Aranha, Princesa, etc.) = decoração COLORIDA (+R$30). SIM FAZEMOS! Papel de arroz: NÃO fazemos, cliente traz de casa (+R$30).
16. ⛔ Minhas frases estão COMPLETAS? Não picotei/abreviei nenhuma frase? O resumo tem frases inteiras?
17. Sobre entrega: SIM entregamos encomendas (exceto 4kg). NÃO disse que só fazemos retirada?
18. Sobre salgados avulsos: SIM vendemos (tamanho normal). NÃO disse que não vendemos avulso?
RESPONDA SOMENTE COM A MENSAGEM PARA O CLIENTE.`);

  return parts.join("\n");
}
