/**
 * agentInterpreter.ts — Classificador DETERMINÍSTICO de intenção + entidades.
 *
 * Tira do LLM a responsabilidade de "entender" a mensagem. A interpretação
 * vira código puro testável — quando o LLM erra, o guardrail que consome
 * esta classificação sabe exatamente o que deveria ter respondido.
 *
 * Regras documentadas em docs/AGENT_CONTRACT.md §1.
 *
 * Saída: { intent, entities, open_questions, next_action, confidence }
 */

import { normalizeForCompare } from "./webhookUtils.ts";
import {
  messageIsAboutTime,
  messageMentionsDecoration,
  messageIsAboutWriting,
} from "./priceEngine.ts";

// ── Tipos ──

export type AgentIntent =
  | "greeting"                 // "oi", "olá", "bom dia"
  | "ask_menu"                 // "qual o cardápio?", "quais sabores?"
  | "ask_price"                // "quanto custa?"
  | "ask_hours"                // "que horas abrem?"
  | "ask_address"              // "onde fica?"
  | "start_order"              // "quero um bolo", "queria pedir"
  | "provide_flavor"           // cliente diz sabor do cardápio
  | "provide_weight"           // cliente diz "2kg"
  | "provide_salgados"         // "25 mini coxinhas"
  | "provide_doces"            // "50 brigadeiros"
  | "provide_time"             // "amanhã às 13h"
  | "provide_writing"          // "escrita Amo Você"
  | "provide_decoration"       // "decoração de flores"
  | "provide_address"          // envia endereço
  | "provide_order_type"       // "delivery" / "retirada" / "encomenda"
  | "confirm_more"             // "só isso", "pode fechar"
  | "want_more"                // "quero mais X"
  | "payment_method_choice"    // "PIX", "dinheiro"
  | "payment_done"             // "paguei", "fiz o pix", "ok vou fazer"
  | "send_proof"               // PDF do comprovante
  | "cancel"                   // "cancela", "desisti"
  | "new_order"                // "quero fazer outro pedido"
  | "smalltalk"                // "tudo bem?", "obrigado"
  | "unclear";                 // não conseguimos determinar

export interface AgentEntities {
  flavor?: string;                  // só se bate cardápio
  flavor_raw?: string;              // o que foi extraído antes de validar
  weight_kg?: number;
  mini_savory_qty?: number;
  mini_savory_types?: string[];     // ["coxinha", "empada"]
  sweets?: Array<{ name: string; qty: number }>;
  writing_phrase?: string;
  decoration_description?: string;
  time_text?: string;
  date_text?: string;
  order_type?: "encomenda" | "delivery" | "retirada";
  writes_about_payment_method?: string; // "pix" | "dinheiro" | "cartao" | "debito" | "credito"
}

export type NextAction =
  | "greet"
  | "ask_what_client_wants"
  | "answer_menu_or_price"
  | "ask_weight"
  | "ask_flavor"
  | "ask_decoration_confirm"
  | "ask_writing_phrase"
  | "ask_salgado_quantity"
  | "ask_order_type"
  | "ask_entrega_ou_retirada"
  | "inform_4kg_only_retirada"
  | "ask_more_items"
  | "ask_payment_method"
  | "send_pix"
  | "wait_for_proof"
  | "confirm_proof_received"
  | "handle_cancel"
  | "reset_for_new_order"
  | "continue_conversation";

export interface InterpretResult {
  intent: AgentIntent;
  entities: AgentEntities;
  /** Perguntas em aberto do cliente que agente precisa responder. */
  open_questions: string[];
  /** Próxima ação que o agente deve tomar. */
  next_action: NextAction;
  /** 0.0 a 1.0 — o quanto temos certeza. */
  confidence: number;
  /** Motivos da classificação (pra debug/log). */
  reasons: string[];
}

export interface RecipeLite {
  name: string;
  sale_price?: number | null;
  slice_price?: number | null;
  whole_price?: number | null;
}

// ── Helpers de detecção ──

function matchFlavorInMenu(
  msg: string,
  recipes: RecipeLite[]
): { name: string; raw: string } | null {
  if (!recipes || recipes.length === 0) return null;
  const msgN = normalizeForCompare(msg);
  // Ordena por nome mais longo primeiro (evita "Brigadeiro" bater em "Brigadeiro Belga")
  const sorted = [...recipes]
    .map((r) => ({ orig: r.name, norm: normalizeForCompare(r.name) }))
    .filter((r) => r.norm.length >= 3)
    .sort((a, b) => b.norm.length - a.norm.length);
  for (const { orig, norm } of sorted) {
    if (msgN.includes(norm)) {
      return { name: orig, raw: norm };
    }
  }
  return null;
}

function extractWeight(msg: string): number | null {
  const m = msg.match(/(\d+)\s*(?:kg|quilos?|kilos?)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 && n <= 20 ? n : null;
}

function extractMiniSavoryQty(msg: string): number | null {
  const m = msg.match(
    /(\d+)\s*(?:mini\s*(?:salgad|coxinh|kibe|quibe|risole|bolinh|empad)\w*)/i
  );
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 && n <= 5000 ? n : null;
}

function extractMiniSavoryTypes(msg: string): string[] {
  const types = new Set<string>();
  const re =
    /(?:mini\s*)?(coxinh\w*|empad\w*|kibe\w*|quibe\w*|risole\w*|bolinh\w*|esfih\w*|past[eé]l\w*|enrolad\w*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(msg)) !== null) {
    const raw = m[1].toLowerCase();
    if (raw.startsWith("coxinh")) types.add("coxinha");
    else if (raw.startsWith("empad")) types.add("empada");
    else if (raw.startsWith("kibe") || raw.startsWith("quibe")) types.add("kibe");
    else if (raw.startsWith("risole")) types.add("risole");
    else if (raw.startsWith("bolinh")) types.add("bolinha");
    else if (raw.startsWith("esfih")) types.add("esfiha");
    else if (raw.startsWith("past")) types.add("pastel");
    else if (raw.startsWith("enrolad")) types.add("enroladinho");
  }
  return Array.from(types);
}

function extractSweets(msg: string): Array<{ name: string; qty: number }> {
  const out: Array<{ name: string; qty: number }> = [];
  const re = /(\d+)\s+(brigadeir\w*|beijinh\w*|cajuzinh\w*|docinh\w*|bem\s*casad\w*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(msg)) !== null) {
    const qty = parseInt(m[1], 10);
    const raw = m[2].toLowerCase();
    let name = "docinho";
    if (raw.startsWith("brigadeir")) name = "brigadeiro";
    else if (raw.startsWith("beijinh")) name = "beijinho";
    else if (raw.startsWith("cajuzinh")) name = "cajuzinho";
    else if (raw.startsWith("bem")) name = "bem casado";
    if (Number.isFinite(qty) && qty > 0) out.push({ name, qty });
  }
  return out;
}

function extractWritingPhrase(msg: string): string | null {
  // Padrões: "escrita X" / "escrever X" / "com a frase X" / "com os dizeres X"
  const patterns = [
    /\bcom\s+a\s+frase\s+["'""'']?([^\n""''.!?]{1,80}?)["'""'']?(?:[.!?\n]|$)/i,
    /\bcom\s+os?\s+dizer(?:es)?\s+["'""'']?([^\n""''.!?]{1,80}?)["'""'']?(?:[.!?\n]|$)/i,
    /\bescrever\s+["'""'']?([^\n""''.!?]{1,80}?)["'""'']?(?:\s+no\s+bolo|\s+em\s+cima|[.!?\n]|$)/i,
    /\bescrita\s+(?:em\s+cima\s+do\s+bolo\s+|no\s+bolo\s+)?["'""'']?([^\n""''.!?]{1,80}?)["'""'']?(?:[.!?\n]|$)/i,
    /\bescrito\s+["'""'']?([^\n""''.!?]{1,80}?)["'""'']?(?:\s+no\s+bolo|[.!?\n]|$)/i,
  ];
  for (const p of patterns) {
    const m = msg.match(p);
    if (m && m[1]) {
      const t = m[1].trim().replace(/["'""'']/g, "");
      if (t.length >= 2) return t;
    }
  }
  return null;
}

function extractDecoration(msg: string): string | null {
  if (!messageMentionsDecoration(msg)) return null;
  const m =
    msg.match(
      /\bdecora[cç][aã]o\s+([a-záàâãéèêíïóôõúüç\s,()]+?)(?:[.!?\n]|$)/i
    ) ||
    msg.match(
      /\bbolo\s+colorid\w*\s+(?:com\s+)?([a-záàâãéèêíïóôõúüç\s,()]+?)(?:[.!?\n]|$)/i
    );
  if (m && m[1]) return m[1].trim().slice(0, 120);
  return "colorida";
}

function extractOrderType(
  text: string
): "encomenda" | "delivery" | "retirada" | null {
  const n = normalizeForCompare(text);
  if (/\bdelivery\b|\bentrega\w*\b/.test(n)) return "delivery";
  if (/\bretirad\w*\b|\bbusco\b|\bbuscar\b|\bpego\s+na\s+loja\b|\bbalc[aã]o\b/.test(n))
    return "retirada";
  if (/\bencomenda\w*\b/.test(n)) return "encomenda";
  return null;
}

function extractPaymentMethodChoice(text: string): string | null {
  const n = normalizeForCompare(text);
  if (!n) return null;
  // Mensagem curta com escolha explícita.
  if (/^pix[.!?\s]*$/.test(n.trim())) return "pix";
  if (/\bvia\s+pix\b|\bem\s+pix\b|\bno\s+pix\b|\bde\s+pix\b/.test(n)) return "pix";
  if (/\bdinheir\w*\b/.test(n)) return "dinheiro";
  if (/\bcart[aã]o\b|\bcredit\w*\b|\bdebit\w*\b/.test(n)) return "cartao";
  if (/\bna\s+loja\b|\bno\s+balc[aã]o\b/.test(n)) return "na_loja";
  return null;
}

function isShortAffirmation(msg: string): boolean {
  const m = msg.trim();
  if (m.length > 80) return false;
  const n = normalizeForCompare(m);
  // Variantes básicas
  const AFFIRM_CORE =
    /^(?:ok|okay|okey|ta\s*bom|esta\s*bom|tudo\s*bem|tudo\s*certo|ta\s*certo|blz|beleza|ja\s*vou|agora\s*mesmo|agora\s*vou|pode\s*deixar|pode\s*ser|certo|perfeito|fechou|fechado|combinado|valeu|obrigad[ao]?|show|top|demais|otimo|e\s*isso|eh\s*isso|isso\s*mesmo|isso\s*ai|so\s*isso|s[oó]\s*isso|e\s*so\s*isso|pode\s*fechar|pode\s*finalizar|finalizar|finaliza|nada\s*mais|bora\s*pagar)[\s.,!?]*$/i;
  if (AFFIRM_CORE.test(n)) return true;
  // "Vou fazer/pagar/mandar/enviar [o pix]" também conta como confirmação curta
  const AFFIRM_VERB =
    /^(?:vou\s*(?:fazer|pagar|mandar|enviar|passar|transferir)(?:\s+(?:o\s+)?(?:pix|comprovante|agora))?|ja\s*fiz(?:\s+(?:o\s+)?pix)?|fiz\s*(?:o\s+)?pix|mandei(?:\s+(?:o\s+)?pix)?)[\s.,!?]*$/i;
  return AFFIRM_VERB.test(n);
}

function isFinalizationConfirmation(msg: string): boolean {
  const n = normalizeForCompare(msg);
  return /\b(?:so\s*isso|s[oó]\s*isso|e\s*isso|eh\s*isso|pode\s*fechar|pode\s*finalizar|nada\s*mais|finalizar|so\s*esse|apenas\s*isso|somente\s*isso|isso\s*s[oó])\b/.test(
    n
  );
}

function isCancel(msg: string): boolean {
  const n = normalizeForCompare(msg);
  return /\b(cancela\w*|desisti\w*|nao\s+quero\s+mais|n[aã]o\s+quero\s+mais|esquec\w*\s+o\s+pedido|deixa\s+pra\s+la)\b/.test(
    n
  );
}

function isNewOrder(msg: string): boolean {
  const n = normalizeForCompare(msg);
  return (
    /\b(nov[oa]\s+pedido|pedido\s+nov[oa]|outro\s+pedido|comec[aá]r\s+de\s+novo|recomec[aá]r|fazer\s+(?:um\s+)?(?:novo|outro)\s+pedido|do\s+zero)\b/.test(
      n
    ) &&
    !/bolo\s+novo|sabor\s+novo|item\s+novo/.test(n)
  );
}

function isPureGreeting(msg: string): boolean {
  const n = normalizeForCompare(msg).replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
  return /^(oi+|ola|ol[áa]|ei+|hey+|bom\s*dia|boa\s*tarde|boa\s*noite|opa|salve|e\s*ai|eai)(\s+tudo\s*(?:bem|bom|certo|joia|beleza))?[\s!?]*$/iu.test(
    n
  );
}

function asksMenu(msg: string): boolean {
  const n = normalizeForCompare(msg);
  return /\b(cardapio|card[aá]pio|menu|catalogo|cat[aá]logo|tabela|quais\s+sabores|que\s+sabores|sabores\s+vcs|sabores\s+voces|sabores\s+tem|tem\s+quais?\s+sabores?|lista\s+de\s+sabores)\b/.test(
    n
  );
}

function asksPrice(msg: string): boolean {
  const n = normalizeForCompare(msg);
  return /\b(quanto\s+(?:custa|fica|e|ta|tá|sai)|qual\s+(?:o\s+)?(?:preco|preço|valor)|tem\s+(?:o\s+)?preco)\b/.test(
    n
  );
}

function asksHours(msg: string): boolean {
  const n = normalizeForCompare(msg);
  return /\b(que\s+hora[s]?\s+(?:abre\w*|fecha\w*|funciona\w*)|vcs?\s+(?:abrem?|fecham?|funcion\w*)|voces?\s+(?:abrem?|fecham?|funcion\w*)|horario\s+(?:de\s+)?(?:funcionamento|abertura|fechamento)|ate\s+que\s+hora|at[eé]\s+que\s+hora|qual\s+(?:o\s+)?horario)\b/.test(
    n
  );
}

function asksAddress(msg: string): boolean {
  const n = normalizeForCompare(msg);
  return /\b(onde\s+(?:fica|vcs|voces|est\w*)|endereco\s+(?:de\s+vcs|da\s+loja|do\s+estabelecimento)|localizac|ficam\s+onde)\b/.test(
    n
  );
}

function looksLikeOrderStart(msg: string): boolean {
  const n = normalizeForCompare(msg);
  return /\b(quero\s+(?:pedir|fazer|um|uma|o|2|3|mini|bolo|salgad|coxinh|brigadeir|docinh)|gostaria\s+de\s+pedir|preciso\s+de|vou\s+querer|queria\s+pedir|me\s+v[eê]|me\s+manda|encomenda|encomendar|fazer\s+um\s+pedido)\b/.test(
    n
  );
}

// ── Interpretador principal ──

export interface InterpretInput {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  recipes: RecipeLite[];
  hasPdfAttachment?: boolean;
}

/**
 * Classifica a mensagem do cliente de forma DETERMINÍSTICA.
 * Nunca depende de LLM. Tudo é regex + matching contra cardápio.
 *
 * Retorna `intent`, `entities`, `open_questions`, `next_action` e `confidence`.
 */
export function interpretMessage(input: InterpretInput): InterpretResult {
  const msg = (input.message || "").trim();
  const entities: AgentEntities = {};
  const reasons: string[] = [];

  // --- 1. Casos triviais ---
  if (input.hasPdfAttachment) {
    return {
      intent: "send_proof",
      entities,
      open_questions: [],
      next_action: "confirm_proof_received",
      confidence: 0.99,
      reasons: ["PDF attachment detectado"],
    };
  }

  if (!msg) {
    return {
      intent: "unclear",
      entities,
      open_questions: [],
      next_action: "continue_conversation",
      confidence: 0.0,
      reasons: ["mensagem vazia"],
    };
  }

  if (isPureGreeting(msg)) {
    return {
      intent: "greeting",
      entities,
      open_questions: [],
      next_action: "greet",
      confidence: 0.95,
      reasons: ["saudação pura"],
    };
  }

  if (isCancel(msg)) {
    return {
      intent: "cancel",
      entities,
      open_questions: [],
      next_action: "handle_cancel",
      confidence: 0.95,
      reasons: ["pedido de cancelamento"],
    };
  }

  if (isNewOrder(msg)) {
    return {
      intent: "new_order",
      entities,
      open_questions: [],
      next_action: "reset_for_new_order",
      confidence: 0.9,
      reasons: ["pedido explícito de novo pedido"],
    };
  }

  // --- 2. Extrai entidades (sempre que possível, mesmo pra intents compostas) ---
  const weight = extractWeight(msg);
  if (weight != null) entities.weight_kg = weight;

  const miniQty = extractMiniSavoryQty(msg);
  if (miniQty != null) entities.mini_savory_qty = miniQty;

  const miniTypes = extractMiniSavoryTypes(msg);
  if (miniTypes.length > 0) entities.mini_savory_types = miniTypes;

  const sweets = extractSweets(msg);
  if (sweets.length > 0) entities.sweets = sweets;

  const writing = extractWritingPhrase(msg);
  if (writing) entities.writing_phrase = writing;

  const decoration = extractDecoration(msg);
  if (decoration) entities.decoration_description = decoration;

  const orderType = extractOrderType(msg);
  if (orderType) entities.order_type = orderType;

  const paymentChoice = extractPaymentMethodChoice(msg);
  if (paymentChoice) entities.writes_about_payment_method = paymentChoice;

  const flavorHit = matchFlavorInMenu(msg, input.recipes);
  if (flavorHit) {
    entities.flavor = flavorHit.name;
    entities.flavor_raw = flavorHit.raw;
  }

  if (messageIsAboutTime(msg)) {
    entities.time_text = msg.slice(0, 120);
    reasons.push("contexto temporal detectado");
  }

  // --- 3. Confirmações / finalização / comprovante ---
  if (isFinalizationConfirmation(msg) || /\bso\s*isso\b|^s[oó]\s*isso$/i.test(normalizeForCompare(msg))) {
    return {
      intent: "confirm_more",
      entities,
      open_questions: [],
      next_action: "ask_payment_method",
      confidence: 0.9,
      reasons: ["cliente confirmou que não quer mais nada"],
    };
  }

  const lastAssistant = [...input.history].reverse().find((h) => h.role === "assistant");
  const lastAssistantNorm = lastAssistant ? normalizeForCompare(lastAssistant.content) : "";
  const lastHadPix =
    /\bpix\b/.test(lastAssistantNorm) ||
    lastAssistantNorm.includes("chave pix") ||
    lastAssistantNorm.includes("comprovante") ||
    /\b50\s*%/.test(lastAssistantNorm);

  // "ok"/"beleza" depois do PIX = vou pagar, aguardar comprovante
  if (lastHadPix && isShortAffirmation(msg)) {
    return {
      intent: "payment_done",
      entities,
      open_questions: [],
      next_action: "wait_for_proof",
      confidence: 0.92,
      reasons: ["confirmação curta após PIX"],
    };
  }

  // Confirmação curta em qualquer ponto: responde na next_action conforme estado
  if (isShortAffirmation(msg)) {
    return {
      intent: "confirm_more",
      entities,
      open_questions: [],
      next_action: "ask_more_items",
      confidence: 0.7,
      reasons: ["afirmação curta"],
    };
  }

  // --- 4. Pergunta explícita ---
  if (asksMenu(msg)) {
    return {
      intent: "ask_menu",
      entities,
      open_questions: [],
      next_action: "answer_menu_or_price",
      confidence: 0.9,
      reasons: ["pergunta de cardápio"],
    };
  }
  if (asksPrice(msg)) {
    return {
      intent: "ask_price",
      entities,
      open_questions: [],
      next_action: "answer_menu_or_price",
      confidence: 0.9,
      reasons: ["pergunta de preço"],
    };
  }
  if (asksHours(msg)) {
    return {
      intent: "ask_hours",
      entities,
      open_questions: [],
      next_action: "continue_conversation",
      confidence: 0.9,
      reasons: ["pergunta de horário"],
    };
  }
  if (asksAddress(msg)) {
    return {
      intent: "ask_address",
      entities,
      open_questions: [],
      next_action: "continue_conversation",
      confidence: 0.9,
      reasons: ["pergunta de endereço"],
    };
  }

  // --- 5. Entidades indicam pedido ---
  const mentionsCake = /\bbolo\b|\btorta\b/i.test(msg);
  const hasSalgado = entities.mini_savory_qty != null || entities.mini_savory_types && entities.mini_savory_types.length > 0;
  const hasDoce = entities.sweets && entities.sweets.length > 0;

  // Escrita tem prioridade: o texto que vem é FRASE, não sabor, nem inicio de pedido.
  if (entities.writing_phrase) {
    return {
      intent: "provide_writing",
      entities,
      open_questions: [],
      next_action: "ask_more_items",
      confidence: 0.9,
      reasons: ["frase de escrita extraída (prioridade sobre outros)"],
    };
  }

  // Sabor só do cardápio, sem outras entidades → provide_flavor
  if (entities.flavor && !mentionsCake && !entities.weight_kg && !hasSalgado && !hasDoce) {
    reasons.push("cliente informou sabor isolado");
    return {
      intent: "provide_flavor",
      entities,
      open_questions: [],
      next_action: "ask_weight",
      confidence: 0.85,
      reasons,
    };
  }

  // Peso isolado → provide_weight (precisa do sabor)
  if (entities.weight_kg && !entities.flavor && !hasSalgado && !hasDoce && !mentionsCake) {
    return {
      intent: "provide_weight",
      entities,
      open_questions: [],
      next_action: "ask_flavor",
      confidence: 0.75,
      reasons: ["peso isolado"],
    };
  }

  // Bolo + sabor + peso
  if (mentionsCake || entities.weight_kg) {
    const missing: NextAction[] = [];
    if (!entities.flavor && !entities.decoration_description) missing.push("ask_flavor");
    if (!entities.weight_kg) missing.push("ask_weight");
    const nextAction = missing[0] || "ask_more_items";
    return {
      intent: "start_order",
      entities,
      open_questions: missing.map((m) => m.replace(/^ask_/, "faltou: ")),
      next_action: nextAction,
      confidence: 0.85,
      reasons: ["fragmento de pedido de bolo"],
    };
  }

  if (hasSalgado || hasDoce) {
    return {
      intent: hasSalgado ? "provide_salgados" : "provide_doces",
      entities,
      open_questions: [],
      next_action: "ask_more_items",
      confidence: 0.85,
      reasons: ["quantidade de salgado/doce informada"],
    };
  }

  if (entities.decoration_description) {
    return {
      intent: "provide_decoration",
      entities,
      open_questions: [],
      next_action: "ask_flavor",
      confidence: 0.8,
      reasons: ["decoração descrita"],
    };
  }

  if (entities.time_text) {
    return {
      intent: "provide_time",
      entities,
      open_questions: [],
      next_action: "continue_conversation",
      confidence: 0.85,
      reasons: ["horário/data fornecido"],
    };
  }

  if (entities.order_type) {
    return {
      intent: "provide_order_type",
      entities,
      open_questions: [],
      next_action: entities.order_type === "encomenda" ? "ask_entrega_ou_retirada" : "continue_conversation",
      confidence: 0.85,
      reasons: ["tipo de pedido escolhido"],
    };
  }

  if (entities.writes_about_payment_method) {
    return {
      intent: "payment_method_choice",
      entities,
      open_questions: [],
      next_action: "send_pix",
      confidence: 0.85,
      reasons: ["forma de pagamento escolhida"],
    };
  }

  if (looksLikeOrderStart(msg)) {
    return {
      intent: "start_order",
      entities,
      open_questions: [],
      next_action: "ask_what_client_wants",
      confidence: 0.7,
      reasons: ["indícios de início de pedido"],
    };
  }

  return {
    intent: "unclear",
    entities,
    open_questions: [],
    next_action: "continue_conversation",
    confidence: 0.3,
    reasons: ["não foi possível classificar"],
  };
}
