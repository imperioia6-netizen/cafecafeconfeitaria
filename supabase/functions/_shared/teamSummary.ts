/**
 * teamSummary.ts — monta a descrição ORGANIZADA do pedido/encomenda que vai
 * para a equipe aprovar (tela de Confirmar Pagamento).
 *
 * Antes, o texto vinha do `product_description` gerado pela LLM — soltava
 * coisas como "Sabor: em cima do bolo trufado" ou item duplicado. Aqui
 * montamos um texto DETERMINÍSTICO por categoria: bolo → salgados → doces
 * → obs → pagamento → entrega.
 *
 * A função é tolerante a dados parciais: usa o que tem, omite o que não tem.
 */

import { normalizeForCompare } from "./webhookUtils.ts";
import { messageIsAboutWriting } from "./priceEngine.ts";

type H = { role: "user" | "assistant"; content: string };

interface SummaryInput {
  customerName?: string;
  customerPhone?: string;
  orderType?: string; // "encomenda" | "delivery" | "retirada" | "pedido" | ""
  /** Método de retirada da encomenda: "entrega" | "retirada" | "". */
  deliveryMethod?: string;
  totalValue?: number;
  signalPaid?: boolean; // paid_50_percent
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  address?: string;
  paymentMethod?: string;
  observations?: string;
  productDescription?: string;
  items?: Array<{ recipe_name?: string; quantity?: number; unit_type?: string; notes?: string }>;
  history: H[];
  currentMessage: string;
  recipeNames?: string[];
}

/**
 * Infere se a encomenda vai ser com ENTREGA ou RETIRADA, a partir de:
 *   1) campo explícito `deliveryMethod` (prioridade máxima)
 *   2) endereço preenchido → entrega
 *   3) orderType / channel ("delivery" → entrega; "retirada"/"balcao" → retirada)
 *   4) histórico do cliente / mensagem atual
 * Retorna string vazia se não der pra decidir.
 */
function resolveDeliveryMethod(input: SummaryInput): "entrega" | "retirada" | "" {
  const explicit = (input.deliveryMethod || "").toLowerCase().trim();
  if (explicit === "entrega" || explicit === "delivery") return "entrega";
  if (
    explicit === "retirada" ||
    explicit === "retirar" ||
    explicit === "retiro" ||
    explicit === "balcao" ||
    explicit === "balcão" ||
    explicit === "loja"
  )
    return "retirada";
  if ((input.address || "").trim()) return "entrega";
  const ot = (input.orderType || "").toLowerCase();
  if (ot === "delivery") return "entrega";
  if (ot === "retirada" || ot === "balcao" || ot === "balcão") return "retirada";

  const allClient = [
    input.currentMessage || "",
    ...input.history.filter((h) => h.role === "user").map((h) => h.content || ""),
  ]
    .join(" ")
    .toLowerCase();
  const retiradaRe =
    /\b(retirad\w*|retirar\w*|retiro\w*|busco\w*|buscar\w*|pego\s+na\s+loja|pegar\s+na\s+loja|passo\s+a[ií]|vou\s+a[ií]|balc[aã]o)\b/;
  const entregaRe =
    /\b(entreg\w*|delivery\w*|levem\w*|mand[ae]m\w*)\b/;
  if (retiradaRe.test(allClient) && !entregaRe.test(allClient)) return "retirada";
  if (entregaRe.test(allClient) && !retiradaRe.test(allClient)) return "entrega";
  // Ambos: fica indefinido (equipe decide/verifica).
  return "";
}

// ── Helpers de extração ──

function extractCakeInfo(
  texts: string[],
  recipeNames: string[] = []
): { sabor: string; peso: string } {
  // Sabor: primeiro procura "sabor é X", depois "bolo de X".
  const joined = texts.join("\n");
  let sabor = "";
  const explicit = joined.match(
    /(?:o\s+)?sabor\s+(?:do\s+bolo\s+)?(?:é|e|eh|sera|será|vai\s+ser|ficou|escolhi|fica|escolho)\s*[:\-]?\s*([a-záàâãéèêíïóôõúüç][a-záàâãéèêíïóôõúüç\s]*)/i
  );
  if (explicit && explicit[1]) {
    sabor = cleanFlavorToken(explicit[1]);
  }
  if (!sabor) {
    const candidates = [
      ...joined.matchAll(
        /bolo\s+(?:de\s+)?([a-záàâãéèêíïóôõúüç][a-záàâãéèêíïóôõúüç\s]*)/gi
      ),
    ]
      .map((m) => cleanFlavorToken(m[1]))
      .filter((s) => s.length > 2);
    // Preferir um nome que bata com o cardápio.
    if (recipeNames.length > 0) {
      const menu = recipeNames.map((n) => normalizeForCompare(n));
      const matched = candidates.find((c) =>
        menu.some((n) => normalizeForCompare(c).includes(n) || n.includes(normalizeForCompare(c)))
      );
      if (matched) sabor = matched;
    }
    if (!sabor && candidates.length > 0) sabor = candidates[candidates.length - 1];
  }
  // Peso: último "Nkg" mencionado.
  const pesoMatches = [...joined.matchAll(/(\d+)\s*kg/gi)].map((m) => `${m[1]}kg`);
  const peso = pesoMatches.length > 0 ? pesoMatches[pesoMatches.length - 1] : "";
  return { sabor: sabor.trim(), peso };
}

function cleanFlavorToken(raw: string): string {
  let s = raw.trim();
  // Cortar em palavras de decoração ou tempo.
  const BAD =
    /\b(com\s+|em\s+cima|de\s+cima|hoje|amanha|amanhã|manha|manhã|tarde|noite|hora|horas|horario|horário|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo|escrita|escrev|decorac|decora|colorid|florid|flores?|bolinhas?|para|pra|as|às|por|ate|até)\b/i;
  const idx = s.search(BAD);
  if (idx >= 0) s = s.slice(0, idx).trim();
  s = s.replace(/^(?:um\s+|uma\s+)?bolo\s+(?:de\s+)?/i, "").trim();
  s = s.replace(/^(?:um|uma|o|a)\s+/i, "").trim();
  return s.replace(/\s{2,}/g, " ").trim();
}

function extractWritingPhrase(texts: string[]): string {
  // Procura "escrita ... X" / "escrever X" / "com a frase X" / "com os dizeres X".
  const joined = texts.join("\n");
  const patterns = [
    /\bcom\s+a\s+frase\s+["""'']?([^\n""''.!?]{1,80}?)["""'']?(?:[.!?\n]|$)/i,
    /\bcom\s+os?\s+dizer(?:es)?\s+["""'']?([^\n""''.!?]{1,80}?)["""'']?(?:[.!?\n]|$)/i,
    /\bescrever\s+["""'']?([^\n""''.!?]{1,80}?)["""'']?(?:\s+no\s+bolo|\s+em\s+cima|[.!?\n]|$)/i,
    /\bescrita\s+(?:em\s+cima\s+do\s+bolo\s+|no\s+bolo\s+)?["""'']?([^\n""''.!?]{1,80}?)["""'']?(?:[.!?\n]|$)/i,
    /\bescrito\s+["""'']?([^\n""''.!?]{1,80}?)["""'']?(?:\s+no\s+bolo|[.!?\n]|$)/i,
  ];
  for (const p of patterns) {
    const m = joined.match(p);
    if (m && m[1]) {
      const t = m[1].trim().replace(/["""'']/g, "");
      if (t.length >= 2) return t;
    }
  }
  return "";
}

function extractDecorationText(texts: string[]): string {
  const joined = texts.join("\n");
  const m =
    joined.match(
      /\bdecora[cç][aã]o\s+([a-záàâãéèêíïóôõúüç\s,()]+?)(?:[.!?\n]|$)/i
    ) ||
    joined.match(
      /\bbolo\s+colorid\w*\s+(?:com\s+)?([a-záàâãéèêíïóôõúüç\s,()]+?)(?:[.!?\n]|$)/i
    );
  if (m && m[1]) return m[1].trim().slice(0, 120);
  // Fallback: se menciona cor/flor/bolinha/tema
  const KW =
    /\b(colorid\w*|florid\w*|flores?|bolinhas?|confeit\w*|homem\s+aranha|princesa|patrulha|frozen|minnie|mickey|chantininho)\b/i;
  if (KW.test(joined)) {
    const mm = joined.match(KW);
    return mm ? mm[0] : "";
  }
  return "";
}

interface ItemBucket {
  bolos: string[];
  salgados: string[];
  doces: string[];
  outros: string[];
}

function categorizeItem(
  name: string,
  qty: number,
  unitType: string,
  historyTexts: string[]
): keyof ItemBucket | null {
  const n = normalizeForCompare(name);
  if (!n) return null;
  if (/\bbolo\b|\btorta\b|fatia/.test(n)) return "bolos";
  if (
    /\b(salgad|coxinh|kibe|quibe|risole|risoles|empada|past[eé]l|pastel|bolinha|esfiha|enrolad)\w*/.test(
      n
    )
  ) {
    return "salgados";
  }
  // Nomes ambíguos (Brigadeiro pode ser bolo OU docinho). Desempata pelo contexto:
  // 1) unit_type = whole com qtd <= 4 → bolo.
  // 2) histórico menciona "bolo <nome>" → bolo.
  // 3) caso contrário: doce (quantidades de docinho costumam ser ≥ 10).
  if (/\b(brigadeiro|beijinho|cajuzinho|docinho|doce|bem\s+casado)\w*/.test(n)) {
    if (unitType === "whole" && qty > 0 && qty <= 4) return "bolos";
    const hist = historyTexts.join(" ").toLowerCase();
    const nameNorm = normalizeForCompare(name);
    const histNorm = normalizeForCompare(hist);
    const boloRe = new RegExp(
      `\\bbolo\\s+(?:de\\s+)?${nameNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );
    if (boloRe.test(histNorm)) return "bolos";
    return "doces";
  }
  return "outros";
}

function formatItem(name: string, qty: number): string {
  const q = qty > 0 ? qty : 1;
  const cleanName = name.replace(/^\s*bolo\s+de\s+/i, "").trim();
  return `${q}× ${cleanName}`;
}

/**
 * Constroi o texto organizado pra equipe aprovar.
 * Formato:
 *   🎂 Bolo: <Sabor> <Peso> [com decoração ...] [com escrita "..."]
 *   🥟 Salgados: ...
 *   🍬 Doces: ...
 *   📝 Obs: ...
 *   💳 Total: R$... (entrada 50%: R$...)
 *   📅 Entrega: <data> <hora>
 *   📍 Endereço: ...
 */
export function buildTeamSummary(input: SummaryInput): string {
  const clientTexts = input.history
    .filter((h) => h.role === "user")
    .map((h) => h.content || "");
  const nonWritingTexts = clientTexts.filter((t) => !messageIsAboutWriting(t));
  const allTexts = [...nonWritingTexts, input.currentMessage];
  const allClientTexts = [...clientTexts, input.currentMessage];

  const bucket: ItemBucket = {
    bolos: [],
    salgados: [],
    doces: [],
    outros: [],
  };
  const seen = new Set<string>();
  for (const it of input.items || []) {
    const name = (it.recipe_name || "").trim();
    if (!name) continue;
    const qty = Math.max(1, Number(it.quantity) || 1);
    const unitType = (it.unit_type || "").toLowerCase();
    const key = `${normalizeForCompare(name)}|${qty}|${unitType}`;
    if (seen.has(key)) continue; // dedupe
    seen.add(key);
    const cat = categorizeItem(name, qty, unitType, allClientTexts);
    if (!cat) continue;
    bucket[cat].push(formatItem(name, qty));
  }

  const { sabor, peso } = extractCakeInfo(nonWritingTexts, input.recipeNames);
  const writingPhrase = extractWritingPhrase(allClientTexts);
  const decorationText = extractDecorationText(nonWritingTexts);

  const lines: string[] = [];

  // Cliente
  const nome = (input.customerName || "").trim();
  const fone = (input.customerPhone || "").trim();
  if (nome || fone) {
    lines.push(`👤 Cliente: ${nome}${fone ? ` (${fone})` : ""}`);
  }
  if (input.orderType) {
    lines.push(`📦 Tipo: ${input.orderType}`);
  }

  // Modalidade (entrega/retirada) — crítico para a equipe.
  const method = resolveDeliveryMethod(input);
  if (method === "entrega") {
    lines.push(`🚚 Modalidade: ENTREGA (delivery)`);
  } else if (method === "retirada") {
    lines.push(`🏪 Modalidade: RETIRADA na loja`);
  } else if ((input.orderType || "").toLowerCase() === "encomenda") {
    lines.push(
      `❓ Modalidade: NÃO DEFINIDA (confirmar com o cliente: entrega ou retirada)`
    );
  }

  // Bolo
  if (bucket.bolos.length > 0 || sabor || peso) {
    const partes: string[] = [];
    if (sabor) partes.push(sabor);
    if (peso) partes.push(peso);
    const detalhesExtra: string[] = [];
    if (decorationText) detalhesExtra.push(`decoração ${decorationText}`);
    if (writingPhrase) detalhesExtra.push(`escrita "${writingPhrase}" (+R$15)`);
    const cabeca = partes.length > 0 ? `🎂 Bolo: ${partes.join(" ")}` : `🎂 Bolo`;
    lines.push(
      detalhesExtra.length > 0 ? `${cabeca} — ${detalhesExtra.join(", ")}` : cabeca
    );
    // Se há MAIS bolos além do já descrito, listá-los.
    if (bucket.bolos.length > 1) {
      lines.push(
        `   (outros bolos: ${bucket.bolos.slice(1).join(", ")})`
      );
    }
  }

  if (bucket.salgados.length > 0) {
    lines.push(`🥟 Salgados: ${bucket.salgados.join(", ")}`);
  }
  if (bucket.doces.length > 0) {
    lines.push(`🍬 Doces: ${bucket.doces.join(", ")}`);
  }
  if (bucket.outros.length > 0) {
    lines.push(`➕ Outros: ${bucket.outros.join(", ")}`);
  }

  // Observações
  const obs = (input.observations || "").trim();
  if (obs) {
    lines.push(`📝 Obs: ${obs.slice(0, 300)}`);
  }

  // Pagamento
  if (input.totalValue && input.totalValue > 0) {
    const sinal = input.signalPaid ? Math.round((input.totalValue / 2) * 100) / 100 : 0;
    const sinalTxt = input.signalPaid ? ` (sinal 50%: R$ ${sinal.toFixed(2)} pago)` : "";
    const pagto = input.paymentMethod ? ` via ${input.paymentMethod}` : "";
    lines.push(
      `💳 Total: R$ ${input.totalValue.toFixed(2)}${sinalTxt}${pagto}`
    );
  }

  // Entrega
  const entregaParts: string[] = [];
  if (input.deliveryDate) entregaParts.push(input.deliveryDate);
  if (input.deliveryTimeSlot) entregaParts.push(input.deliveryTimeSlot);
  if (entregaParts.length > 0) {
    lines.push(`📅 Entrega: ${entregaParts.join(" às ")}`);
  }
  const addr = (input.address || "").trim();
  if (addr) {
    lines.push(`📍 Endereço: ${addr}`);
  }

  // Fallback: se por algum motivo nada foi extraído, usa a descrição original.
  if (lines.length === 0) {
    const fallback = (input.productDescription || "Encomenda").slice(0, 300);
    return fallback;
  }

  return lines.join("\n").slice(0, 800);
}
