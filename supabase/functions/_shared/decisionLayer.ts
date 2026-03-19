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

  // ── Detectar bolo com peso ──
  const boloMatch = msgLower.match(
    /(?:bolo\s+(?:de\s+)?)([\w\sà-ú]+?)(?:\s+(?:de\s+)?(\d+)\s*kg)/i
  );
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
        `[SALGADOS] Quantidade ${qtd} não é múltiplo de 25. Sugestões: ${validacao.sugestaoInferior} ou ${validacao.sugestaoSuperior}`
      );
    }
    const resultado = calcularSalgados(qtd);
    calculos.push(
      `[CÁLCULO] ${qtd} mini salgados: R$${resultado.valor.toFixed(2)} (R$175/cento)`
    );
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

  // 1. Prompt fixo MÍNIMO
  parts.push(`Você é a atendente virtual da Café Café Confeitaria.

Regras:
- Responda apenas com base no contexto fornecido.
- Nunca invente preço, taxa, produto, prazo ou disponibilidade.
- Se faltar informação, diga que vai verificar.
- Seja humana, profissional, clara e objetiva.
- Sempre conduza para o fechamento do pedido quando fizer sentido.
- Nunca finalize pedido sem validação completa.
- Use os CÁLCULOS PRÉ-FEITOS quando disponíveis — são exatos.`);

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

  // 7. Cardápio detalhado (fonte de verdade)
  const needsMenu = ["cakes", "cake_slice", "mini_savories", "savories", "sweets", "drinks", "pricing", "order_now", "pre_order"].includes(ctx.intent);
  if (ctx.cardapioDetalhado && needsMenu) {
    parts.push(`\n═══ CARDÁPIO E PREÇOS (FONTE DE VERDADE) ═══\n${ctx.cardapioDetalhado}\n⚠️ Se NÃO está aqui, NÃO EXISTE.`);
  }

  // 8. Zonas de delivery
  const needsDelivery = ["delivery", "delivery_fee", "order_now", "pre_order"].includes(ctx.intent);
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

  // 11. Lembrete final
  parts.push(`\n═══ ANTES DE RESPONDER ═══
1. Li TODA a mensagem? 2. Verifiquei HISTÓRICO? 3. Usei CÁLCULOS PRÉ-FEITOS?
4. Produto EXISTE no cardápio? 5. Resposta CURTA e NATURAL?
RESPONDA SOMENTE COM A MENSAGEM PARA O CLIENTE.`);

  return parts.join("\n");
}
