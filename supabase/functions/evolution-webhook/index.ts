import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOwner, isOwnerPhoneInList, parseOwnerPhonesList, normalizePhone } from "../_shared/getOwner.ts";
import { runAssistente, runAtendente } from "../_shared/agentLogic.ts";
import { sendTicketFlowOrder } from "../_shared/ticketflow.ts";
import {
  sanitizeMessage,
  sanitizePhone,
  sanitizeName,
  isAllowedEvolutionBaseUrl,
  verifyWebhookSecret,
} from "../_shared/security.ts";
import {
  extractTextFromPdf,
  isPdfMimetype,
  isPdfFileName,
} from "../_shared/pdfExtract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const EVOLUTION_KEYS = ["evolution_base_url", "evolution_api_key", "evolution_instance", "evolution_webhook_secret"] as const;
const SEND_MESSAGE_TIMEOUT_MS = 12000;
const CARDAPIO_PDF_URL = "http://bit.ly/3OYW9Fw";

function getEvolutionConfig(settings: { key: string; value: string }[]) {
  const map = new Map(settings.map((s) => [s.key, s.value]));
  const baseUrl = (map.get("evolution_base_url") || "").trim().replace(/\/$/, "");
  const apiKey = (map.get("evolution_api_key") || "").trim();
  let instance = (map.get("evolution_instance") || "default").trim() || "default";
  instance = instance.replace(/\s+/g, "-");
  const webhookSecret = (map.get("evolution_webhook_secret") || "").trim() || null;
  return { baseUrl, apiKey, instance, webhookSecret };
}

function extractMessageText(payload: Record<string, unknown>): string {
  const msg = payload.message as Record<string, unknown> | undefined;
  if (!msg) return "";
  if (typeof msg.conversation === "string") return msg.conversation;
  const ext = msg.extendedTextMessage as { text?: string } | undefined;
  if (ext && typeof ext.text === "string") return ext.text;
  const doc = msg.documentMessage as { caption?: string } | undefined;
  if (doc && typeof doc.caption === "string") return doc.caption;
  return "";
}

/** Verifica se o payload tem um documento PDF (documentMessage com mimetype ou nome .pdf). */
function hasPdfDocument(payload: Record<string, unknown>): boolean {
  const msg = payload.message as Record<string, unknown> | undefined;
  if (!msg?.documentMessage) return false;
  const doc = msg.documentMessage as { mimetype?: string; fileName?: string };
  return isPdfMimetype(doc.mimetype) || isPdfFileName(doc.fileName);
}

/** Obtém os bytes do documento do payload: base64 embutido ou via Evolution getBase64FromMediaMessage. */
async function getDocumentBytes(
  payload: Record<string, unknown>,
  evo: { baseUrl: string; apiKey: string; instance: string }
): Promise<Uint8Array | null> {
  const msg = payload.message as Record<string, unknown> | undefined;
  const doc = msg?.documentMessage as { base64?: string } | undefined;
  if (doc?.base64 && typeof doc.base64 === "string") {
    try {
      const bin = Uint8Array.from(atob(doc.base64), (c) => c.charCodeAt(0));
      return bin.length > 0 && bin.length <= 5 * 1024 * 1024 ? bin : null;
    } catch {
      return null;
    }
  }
  if (!evo.baseUrl || !evo.apiKey || !isAllowedEvolutionBaseUrl(evo.baseUrl)) return null;
  try {
    const url = `${evo.baseUrl.replace(/\/$/, "")}/chat/getBase64FromMediaMessage/${encodeURIComponent(evo.instance)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": evo.apiKey },
      body: JSON.stringify({ message: msg, key: payload.key }),
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { base64?: string } | null;
    const b64 = json?.base64;
    if (typeof b64 !== "string") return null;
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return bin.length > 0 && bin.length <= 5 * 1024 * 1024 ? bin : null;
  } catch {
    return null;
  }
}

function extractRemoteJid(payload: Record<string, unknown>): string {
  const key = payload.key as { remoteJid?: string } | undefined;
  const jid = key?.remoteJid || "";
  return String(jid).replace(/@.*$/, "").trim();
}

function extractMessageId(payload: Record<string, unknown>): string | null {
  const key = payload.key as { id?: string } | undefined;
  const id = key?.id;
  return typeof id === "string" && id.length > 0 && id.length <= 128 ? id : null;
}

function normalizeForCompare(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildRecentHistoryHint(history: { role: "user" | "assistant"; content: string }[]): string {
  const recent = history.slice(-6);
  if (recent.length === 0) return "";
  const lines = recent.map((h) => `${h.role === "user" ? "cliente" : "atendente"}: ${h.content.slice(0, 180)}`);
  return lines.join("\n");
}

function buildPreviousQuestionHint(
  history: { role: "user" | "assistant"; content: string }[],
  currentMessage: string
): string {
  const recentAssistant = [...history].reverse().find((h) => h.role === "assistant" && !!h.content?.trim());
  if (!recentAssistant) return "";
  const msg = (currentMessage || "").trim();
  if (!msg || msg.length > 80) return "";
  if (!recentAssistant.content.includes("?")) return "";
  return `A mensagem atual parece resposta da pergunta anterior do atendente.\nPergunta anterior: ${recentAssistant.content.slice(0, 220)}\nResposta atual do cliente: ${msg}`;
}

type ConversationIntent =
  | "greeting"
  | "start_order"
  | "ask_price"
  | "ask_recommendation"
  | "delivery_urgency"
  | "payment_proof"
  | "other";

type ConversationStage =
  | "start"
  | "collecting_items"
  | "awaiting_order_type"
  | "confirming_order"
  | "awaiting_payment"
  | "post_payment";

function detectIntent(fullMessage: string): ConversationIntent {
  const msg = normalizeForCompare(fullMessage);
  if (/^(oi|ola|olá|boa noite|bom dia|boa tarde)\b/.test(msg)) return "greeting";
  if (msg.includes("comprovante") || msg.includes("pix") || msg.includes("paguei") || msg.includes("pago")) return "payment_proof";
  if (msg.includes("preco") || msg.includes("valor") || msg.includes("quanto")) return "ask_price";
  if (msg.includes("recomenda") || msg.includes("sugere") || msg.includes("qual bolo")) return "ask_recommendation";
  if ((msg.includes("entregar") || msg.includes("delivery")) && (msg.includes("agora") || msg.includes("hoje"))) return "delivery_urgency";
  if (msg.includes("quero pedir") || msg.includes("fazer um pedido") || msg.includes("gostaria de pedir") || msg.includes("encomenda")) return "start_order";
  return "other";
}

function deriveStage(
  memory: Record<string, unknown>,
  intent: ConversationIntent,
  fullMessage: string
): ConversationStage {
  const msg = normalizeForCompare(fullMessage);
  const oldStage = (memory.stage as ConversationStage | undefined) || "start";
  const mentionsOrderType = msg.includes("delivery") || msg.includes("retirada") || msg.includes("encomenda");
  if (intent === "payment_proof") return "post_payment";
  if (intent === "start_order" && !mentionsOrderType) return "awaiting_order_type";
  if (intent === "start_order" && mentionsOrderType) return "collecting_items";
  if (oldStage === "awaiting_payment" && intent === "other") return "awaiting_payment";
  if (intent === "ask_price" || intent === "ask_recommendation") return "collecting_items";
  return oldStage;
}

function buildControlHint(
  intent: ConversationIntent,
  stage: ConversationStage,
  memory: Record<string, unknown>
): string {
  const lastIntent = (memory.last_intent as string | undefined) || "none";
  return `[MOTOR_DE_CONTROLE_DE_FLUXO]
- intent_atual: ${intent}
- etapa_atual: ${stage}
- intent_anterior: ${lastIntent}
- regras_chave:
  1) nao inventar produto fora do cardapio
  2) manter contexto continuo da conversa
  3) se etapa_atual=awaiting_order_type, perguntar objetivamente: "É para encomenda, delivery ou retirada?"
  4) se etapa_atual=collecting_items, coletar itens e so depois fechar total
  5) resposta curta, humana, direta e com pausa natural
[/MOTOR_DE_CONTROLE_DE_FLUXO]`;
}

function enforceOrderTypeQuestion(
  replyText: string,
  intent: ConversationIntent,
  stage: ConversationStage,
  fullMessage: string
): string {
  if (!replyText) return replyText;
  const msg = normalizeForCompare(fullMessage);
  const hasOrderTypeInUserMsg = msg.includes("delivery") || msg.includes("retirada") || msg.includes("encomenda");
  if (intent !== "start_order" || hasOrderTypeInUserMsg || stage !== "awaiting_order_type") return replyText;
  const rep = normalizeForCompare(replyText);
  if (rep.includes("encomenda") && rep.includes("delivery") && rep.includes("retirada")) return replyText;
  return `${replyText.trim()}\n\nÉ para encomenda, delivery ou retirada?`;
}

function splitAboveFourKg(totalKg: number): number[] {
  const parts: number[] = [];
  let rem = totalKg;
  while (rem > 4) {
    parts.push(4);
    rem -= 4;
  }
  if (rem > 0) parts.push(rem);
  return parts;
}

function extractDecorationRequestFromMessage(fullMessage: string): string | null {
  const text = (fullMessage || "").trim();
  if (!text) return null;
  const norm = normalizeForCompare(text);
  const askedDecoration =
    norm.includes("decoracao") ||
    norm.includes("decorar") ||
    norm.includes("decorado") ||
    norm.includes("topo") ||
    norm.includes("chantininho") ||
    norm.includes("pasta americana");
  if (!askedDecoration) return null;
  return text.slice(0, 300);
}

function applyDecorationToPedidoPayload(
  pedidoJson: Record<string, unknown> | null,
  decorationText: string | null
): Record<string, unknown> | null {
  if (!pedidoJson || !decorationText) return pedidoJson;
  const items = (pedidoJson.items as Array<Record<string, unknown>> | undefined) || [];
  if (items.length === 0) return pedidoJson;
  const mapped = items.map((it) => {
    const note = (typeof it.notes === "string" ? it.notes.trim() : "");
    const line = `Decoração solicitada (mensagem do cliente): "${decorationText}"`;
    if (note) return { ...it, notes: `${note} | ${line}`.slice(0, 500) };
    return { ...it, notes: line.slice(0, 500) };
  });
  return { ...pedidoJson, items: mapped };
}

function applyDecorationToEncomendaPayload(
  encomendaJson: Record<string, unknown> | null,
  decorationText: string | null
): Record<string, unknown> | null {
  if (!encomendaJson || !decorationText) return encomendaJson;
  const obs = typeof encomendaJson.observations === "string" ? encomendaJson.observations.trim() : "";
  const line = `Decoração solicitada (mensagem do cliente): "${decorationText}"`;
  const merged = obs ? `${obs} | ${line}` : line;
  return { ...encomendaJson, observations: merged.slice(0, 500) };
}

function detectCakePriceIntent(
  fullMessage: string,
  recipes: { name: string; whole_price?: number | null; sale_price?: number | null; slice_price?: number | null }[]
): string | null {
  const msgNorm = normalizeForCompare(fullMessage);
  const asksPrice = msgNorm.includes("preco") || msgNorm.includes("valor") || msgNorm.includes("quanto");
  const talksCake = msgNorm.includes("bolo");
  if (!asksPrice || !talksCake || recipes.length === 0) return null;

  const byName = recipes
    .map((r) => ({
      name: r.name,
      norm: normalizeForCompare(r.name),
      price: Number(r.whole_price ?? r.sale_price ?? r.slice_price ?? 0),
    }))
    .filter((r) => r.price > 0)
    .sort((a, b) => b.norm.length - a.norm.length);

  const matched = byName.find((r) => msgNorm.includes(r.norm));
  if (!matched) return null;

  const kgMatch = fullMessage.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  if (!kgMatch) {
    return `O bolo de ${matched.name} está R$ ${matched.price.toFixed(2)} por kg 😊`;
  }

  const kg = Number((kgMatch[1] || "").replace(",", "."));
  if (!Number.isFinite(kg) || kg <= 0) return null;
  if (!Number.isInteger(kg)) {
    return `Para bolo por kg a gente trabalha com peso inteiro (1kg, 2kg, 3kg ou 4kg por bolo) 😊`;
  }

  if (kg > 4) {
    const parts = splitAboveFourKg(kg);
    const total = kg * matched.price;
    const splitText = parts.map((p) => `${p}kg`).join(" + ");
    return `Para ${kg}kg, dividimos em mais de um bolo por causa do limite da forma: ${splitText}. O valor total fica R$ ${total.toFixed(2)} (R$ ${matched.price.toFixed(2)}/kg).`;
  }

  const total = kg * matched.price;
  return `O bolo de ${matched.name} com ${kg}kg fica R$ ${total.toFixed(2)} (R$ ${matched.price.toFixed(2)}/kg).`;
}

function extractBoloRecommendations(text: string): string[] {
  const out: string[] = [];
  const matches = text.match(/bolo\s+de\s+[a-zA-ZÀ-ÿ0-9\s]+/gi) || [];
  for (const m of matches) {
    const cleaned = m
      .replace(/[.,!?;:()\[\]"]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length >= 8) out.push(cleaned);
  }
  return [...new Set(out)];
}

function hasInvalidRecommendation(replyText: string, recipeNames: string[]): boolean {
  const normalizedRecipes = recipeNames.map((n) => normalizeForCompare(n));
  const candidates = extractBoloRecommendations(replyText).map((c) => normalizeForCompare(c));
  if (candidates.length === 0) return false;
  for (const candidate of candidates) {
    const found = normalizedRecipes.some((r) => r === candidate || r.includes(candidate) || candidate.includes(r));
    if (!found) return true;
  }
  return false;
}

function enforceReplyGuardrails(
  replyText: string,
  recipeNames: string[],
  fullMessage: string
): string {
  if (!replyText || recipeNames.length === 0) return replyText;
  const msg = normalizeForCompare(fullMessage);
  const askedRecommendation =
    msg.includes("recomenda") ||
    msg.includes("sugere") ||
    msg.includes("sugestao") ||
    msg.includes("sugestão") ||
    msg.includes("qual bolo") ||
    msg.includes("qual outro") ||
    msg.includes("teria outro");
  if (!askedRecommendation) return replyText;
  if (!hasInvalidRecommendation(replyText, recipeNames)) return replyText;
  const top = recipeNames.slice(0, 4).join(", ");
  return `Claro! Para te recomendar certinho, eu sigo apenas os sabores do cardápio oficial 😊\n\nAlgumas opções que temos aqui: ${top}.\nSe quiser, te envio o cardápio completo: ${CARDAPIO_PDF_URL}`;
}

async function sendEvolutionMessage(
  baseUrl: string,
  apiKey: string,
  instance: string,
  number: string,
  text: string
): Promise<void> {
  const num = number.replace(/\D/g, "").slice(-15);
  if (!num || num.length < 10 || !text) return;
  if (!isAllowedEvolutionBaseUrl(baseUrl)) throw new Error("Evolution URL inválida (apenas HTTPS permitido)");
  const url = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_MESSAGE_TIMEOUT_MS);
  try {
    const dynamicDelay = Math.min(9000, Math.max(1200, Math.floor(text.length * 24)));
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({
        number: num,
        text: text.slice(0, 4096),
        delay: dynamicDelay,
        textMessage: { text: text.slice(0, 4096) },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Evolution send failed: ${res.status} ${err.slice(0, 150)}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

async function findOrCreateCustomer(
  supabase: any,
  phone: string,
  name: string
): Promise<string> {
  const normalized = normalizePhone(phone);
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", normalized)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: existing2 } = await supabase
    .from("customers")
    .select("id")
    .ilike("phone", `%${normalized.slice(-8)}`)
    .limit(1)
    .maybeSingle();
  if (existing2?.id) return existing2.id;
  const remoteJid = normalized || phone;
  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      name: sanitizeName(name) || "WhatsApp",
      phone: normalized || phone,
      remote_jid: remoteJid,
      status: "novo",
    })
    .select("id")
    .single();
  if (error) throw error;
  return created!.id;
}

function getSuggestedLeadStatus(currentStatus: string | null, message: string): string {
  const base = currentStatus || "novo_lead";
  const txt = message.toLowerCase();

  // Conversa já fechada/concluída
  if (
    txt.includes("fechado") ||
    txt.includes("fechou") ||
    txt.includes("confirmo") ||
    txt.includes("confirmar") ||
    txt.includes("pagar") ||
    txt.includes("pagamento") ||
    txt.includes("pix")
  ) {
    // Etapa imediatamente antes de virar cliente no funil visual
    return "proposta_aceita";
  }

  // Cliente pedindo preço, condições ou detalhes do pedido → negociação
  if (
    txt.includes("preço") ||
    txt.includes("preco") ||
    txt.includes("valor") ||
    txt.includes("quanto") ||
    txt.includes("orçamento") ||
    txt.includes("orcamento") ||
    txt.includes("entrega") ||
    txt.includes("horário") ||
    txt.includes("horario") ||
    txt.includes("data")
  ) {
    if (base === "proposta_aceita" || base === "convertido") return base;
    return "em_negociacao";
  }

  // Caso padrão: mantém status atual ou novo_lead
  return base;
}

async function findOrCreateLead(
  supabase: any,
  phone: string,
  name: string,
  message: string
): Promise<string | null> {
  const normalized = normalizePhone(phone);
  const { data: existing } = await supabase
    .from("social_leads")
    .select("id, status")
    .eq("source", "whatsapp")
    .eq("phone", normalized)
    .limit(1)
    .maybeSingle();

  const nextStatus = getSuggestedLeadStatus(existing?.status ?? null, message);
  const now = new Date().toISOString();

  if (existing?.id) {
    // Atualiza estágio se mudou com base na mensagem
    if (nextStatus !== existing.status) {
      await supabase
        .from("social_leads")
        .update({ status: nextStatus, stage_changed_at: now } as any)
        .eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("social_leads")
    .insert({
      instagram_handle: "wa_" + (normalized || phone).slice(-10),
      phone: normalized || phone,
      name: sanitizeName(name) || null,
      source: "whatsapp",
      status: nextStatus,
      stage_changed_at: nextStatus !== "novo_lead" ? now : null,
    } as any)
    .select("id")
    .single();

  if (error) return null;
  return created?.id ?? null;
}

const FALLBACK_REPLY = "Obrigado pela mensagem! Em instantes nossa equipe retorna.";

/** Extrai blocos [CRIAR_PEDIDO], [CRIAR_ENCOMENDA], [QUITAR_ENCOMENDA], [ATUALIZAR_CLIENTE] e [ALERTA_EQUIPE] da resposta da IA. */
function parseCreateBlocks(reply: string): {
  replyClean: string;
  pedidoJson: Record<string, unknown> | null;
  encomendaJson: Record<string, unknown> | null;
  quitarEncomendaJson: Record<string, unknown> | null;
  atualizarClienteJson: Record<string, unknown> | null;
  alertaEquipeText: string | null;
} {
  let replyClean = reply;
  let pedidoJson: Record<string, unknown> | null = null;
  let encomendaJson: Record<string, unknown> | null = null;
  let quitarEncomendaJson: Record<string, unknown> | null = null;
  let atualizarClienteJson: Record<string, unknown> | null = null;
  let alertaEquipeText: string | null = null;

  const pedidoMatch = reply.match(/\[CRIAR_PEDIDO\]([\s\S]*?)\[\/CRIAR_PEDIDO\]/i);
  if (pedidoMatch) {
    replyClean = replyClean.replace(/\s*\[CRIAR_PEDIDO\][\s\S]*?\[\/CRIAR_PEDIDO\]\s*/gi, "").trim();
    try {
      pedidoJson = JSON.parse(pedidoMatch[1].trim()) as Record<string, unknown>;
    } catch {
      pedidoJson = null;
    }
  }

  const encomendaMatch = reply.match(/\[CRIAR_ENCOMENDA\]([\s\S]*?)\[\/CRIAR_ENCOMENDA\]/i);
  if (encomendaMatch) {
    replyClean = replyClean.replace(/\s*\[CRIAR_ENCOMENDA\][\s\S]*?\[\/CRIAR_ENCOMENDA\]\s*/gi, "").trim();
    try {
      encomendaJson = JSON.parse(encomendaMatch[1].trim()) as Record<string, unknown>;
    } catch {
      encomendaJson = null;
    }
  }

  const quitarMatch = reply.match(/\[QUITAR_ENCOMENDA\]([\s\S]*?)\[\/QUITAR_ENCOMENDA\]/i);
  if (quitarMatch) {
    replyClean = replyClean.replace(/\s*\[QUITAR_ENCOMENDA\][\s\S]*?\[\/QUITAR_ENCOMENDA\]\s*/gi, "").trim();
    try {
      quitarEncomendaJson = JSON.parse(quitarMatch[1].trim()) as Record<string, unknown>;
    } catch {
      quitarEncomendaJson = null;
    }
  }

  const atualizarMatch = reply.match(/\[ATUALIZAR_CLIENTE\]([\s\S]*?)\[\/ATUALIZAR_CLIENTE\]/i);
  if (atualizarMatch) {
    replyClean = replyClean.replace(/\s*\[ATUALIZAR_CLIENTE\][\s\S]*?\[\/ATUALIZAR_CLIENTE\]\s*/gi, "").trim();
    try {
      atualizarClienteJson = JSON.parse(atualizarMatch[1].trim()) as Record<string, unknown>;
    } catch {
      atualizarClienteJson = null;
    }
  }

  // NOVO: Extrair bloco [ALERTA_EQUIPE]
  const alertaMatch = reply.match(/\[ALERTA_EQUIPE\]([\s\S]*?)\[\/ALERTA_EQUIPE\]/i);
  if (alertaMatch) {
    replyClean = replyClean.replace(/\s*\[ALERTA_EQUIPE\][\s\S]*?\[\/ALERTA_EQUIPE\]\s*/gi, "").trim();
    alertaEquipeText = alertaMatch[1].trim() || null;
  }

  return { replyClean, pedidoJson, encomendaJson, quitarEncomendaJson, atualizarClienteJson, alertaEquipeText };
}

/** Obtém operator_id para pedidos criados pelo bot: automático (primeiro perfil) ou crm_settings bot_operator_id. */
async function getBotOperatorId(supabase: any): Promise<string | null> {
  const { data: settings } = await supabase.from("crm_settings").select("value").eq("key", "bot_operator_id").maybeSingle();
  const uid = (settings as { value?: string } | null)?.value?.trim();
  if (uid) return uid;
  const { data: profile } = await supabase.from("profiles").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
  return (profile as { id?: string } | null)?.id ?? null;
}

/** Cria pedido + itens + venda na plataforma a partir do JSON emitido pela IA (após comprovante). */
async function createOrderFromPayload(
  supabase: any,
  payload: Record<string, unknown>,
  customerPhone: string,
  customerName: string,
  evo: { baseUrl: string; apiKey: string; instance: string },
  ownerPhones: string[]
): Promise<{ ok: boolean; orderId?: string; error?: string }> {
  const operatorId = await getBotOperatorId(supabase);
  if (!operatorId) {
    console.error("createOrderFromPayload: nenhum operator_id (bot_operator_id ou profile)");
    return { ok: false, error: "operator_id não configurado" };
  }

  const items = (payload.items as { recipe_name?: string; quantity?: number; unit_type?: string; notes?: string }[]) || [];
  if (items.length === 0) return { ok: false, error: "itens vazios" };

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, sale_price, slice_price, whole_price, slice_weight_grams, whole_weight_grams")
    .eq("active", true);
  const recipeMap = new Map<
    string,
    { id: string; sale_price: number; slice_price: number | null; whole_price: number | null; slice_weight_grams: number | null; whole_weight_grams: number | null }
  >();
  for (const r of recipes || []) {
    const name = (r as { name: string }).name?.trim().toLowerCase();
    if (name) recipeMap.set(name, {
      id: (r as { id: string }).id,
      sale_price: Number((r as { sale_price?: number }).sale_price) || 0,
      slice_price: (r as { slice_price?: number }).slice_price != null ? Number((r as { slice_price: number }).slice_price) : null,
      whole_price: (r as { whole_price?: number }).whole_price != null ? Number((r as { whole_price: number }).whole_price) : null,
      slice_weight_grams: (r as { slice_weight_grams?: number | null }).slice_weight_grams ?? null,
      whole_weight_grams: (r as { whole_weight_grams?: number | null }).whole_weight_grams ?? null,
    });
  }

  const orderItems: { recipe_id: string; quantity: number; unit_price: number; unit_type: string; notes: string | null }[] = [];
  for (const item of items) {
    const name = String(item.recipe_name || "").trim().toLowerCase();
    let recipeEntry = recipeMap.get(name) ?? null;
    if (!recipeEntry && name) {
      for (const [k, v] of recipeMap.entries()) {
        if (k.includes(name) || name.includes(k)) {
          recipeEntry = v;
          break;
        }
      }
    }
    if (!recipeEntry) continue;
    const unitType = (item.unit_type || "slice").toLowerCase() === "whole" ? "whole" : "slice";
    const unitPrice = unitType === "whole" && recipeEntry.whole_price != null ? recipeEntry.whole_price : (recipeEntry.slice_price ?? recipeEntry.sale_price);
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    orderItems.push({
      recipe_id: recipeEntry.id,
      quantity: qty,
      unit_price: unitPrice,
      unit_type: unitType,
      notes: (item.notes && String(item.notes).trim()) || null,
    });
  }
  if (orderItems.length === 0) return { ok: false, error: "nenhum item válido" };

  const channel = (payload.channel as string) || "cardapio_digital";
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      operator_id: operatorId,
      order_number: (payload.order_number as string) || null,
      table_number: (payload.table_number as string) || null,
      customer_name: (payload.customer_name as string) || customerName || "Cliente WhatsApp",
      customer_phone: customerPhone || null,
      channel: channel === "delivery" ? "delivery" : channel === "balcao" ? "balcao" : "cardapio_digital",
      status: "aberto",
      delivery_status: channel === "delivery" ? "recebido" : null,
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (orderErr || !order) {
    console.error("createOrderFromPayload order insert:", orderErr);
    return { ok: false, error: (orderErr as Error)?.message };
  }

  const orderId = (order as { id: string }).id;

  // Tentar vincular cada item a um lote de estoque (inventory) para poder dar baixa automática.
  const orderItemsWithInventory: {
    recipe_id: string;
    quantity: number;
    unit_price: number;
    unit_type: string;
    notes: string | null;
    inventory_id: string | null;
  }[] = [];
  for (const i of orderItems) {
    const { data: inv } = await supabase
      .from("inventory")
      .select("id")
      .eq("recipe_id", i.recipe_id)
      .gt("stock_grams", 0)
      .order("produced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    orderItemsWithInventory.push({
      ...i,
      inventory_id: (inv as { id?: string } | null)?.id ?? null,
    });
  }

  const toInsert = orderItemsWithInventory.map((i) => ({
    order_id: orderId,
    recipe_id: i.recipe_id,
    inventory_id: i.inventory_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: i.quantity * i.unit_price,
    unit_type: i.unit_type,
    notes: i.notes,
  }));
  const { error: itemsErr } = await supabase.from("order_items").insert(toInsert as Record<string, unknown>[]);
  if (itemsErr) {
    console.error("createOrderFromPayload order_items insert:", itemsErr);
    return { ok: false, error: (itemsErr as Error)?.message };
  }

  const total = orderItemsWithInventory.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const paymentRaw = ((payload.payment_method as string) || "pix").toLowerCase();
  const payment_method =
    paymentRaw === "credito" || paymentRaw === "crédito"
      ? "credito"
      : paymentRaw === "debito" || paymentRaw === "débito"
        ? "debito"
        : paymentRaw === "dinheiro"
          ? "dinheiro"
          : paymentRaw === "refeicao" || paymentRaw === "refeição"
            ? "refeicao"
            : "pix";

  // Registrar venda (sales) ligada a esse pedido.
  const soldAt = new Date().toISOString();
  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      operator_id: operatorId,
      channel: channel === "delivery" ? "delivery" : channel === "balcao" ? "balcao" : "cardapio_digital",
      payment_method: payment_method as any,
      total,
      order_number: (payload.order_number as string) || null,
      table_number: (payload.table_number as string) || null,
      customer_name: (payload.customer_name as string) || customerName || "Cliente WhatsApp",
      customer_id: null,
      sold_at: soldAt,
    } as Record<string, unknown>)
    .select("id")
    .single();
  if (saleErr || !sale) {
    console.error("createOrderFromPayload sale insert:", saleErr);
    return { ok: false, error: (saleErr as Error)?.message };
  }
  const saleId = (sale as { id: string }).id;

  const saleItems = orderItemsWithInventory.map((i) => ({
    sale_id: saleId,
    recipe_id: i.recipe_id,
    inventory_id: i.inventory_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: i.quantity * i.unit_price,
    unit_type: i.unit_type,
  }));
  const { error: siErr } = await supabase.from("sale_items").insert(saleItems as Record<string, unknown>[]);
  if (siErr) {
    console.error("createOrderFromPayload sale_items insert:", siErr);
    return { ok: false, error: (siErr as Error)?.message };
  }

  // Envia pedido para a plataforma de notas (TicketFlow) sem bloquear o fluxo principal.
  try {
    const itemsForTicket = orderItemsWithInventory.map((i) => {
      const recipe = (recipes || []).find((r: any) => (r as { id: string }).id === i.recipe_id) as { name?: string } | undefined;
      const name = (recipe?.name || "produto").toString();
      return {
        name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.quantity * i.unit_price,
      };
    });
    await sendTicketFlowOrder(supabase as any, customerPhone, {
      type: "pedido",
      external_id: orderId,
      channel: channel === "delivery" ? "delivery" : channel === "balcao" ? "retirada" : "cardapio_digital",
      total,
      payment_method,
      items: itemsForTicket,
    } as any);
  } catch (e) {
    console.error("createOrderFromPayload ticketflow error:", (e as Error).message);
  }

  // Dar baixa no estoque (inventory.stock_grams / slices_available) e, se estiver acabando, avisar donos no WhatsApp.
  for (const i of orderItemsWithInventory) {
    if (!i.inventory_id) continue;
    const recipeEntry = [...recipeMap.values()].find((r) => r.id === i.recipe_id);
    if (!recipeEntry) continue;
    const unitWeight =
      i.unit_type === "whole"
        ? Number(recipeEntry.whole_weight_grams) || 0
        : Number(recipeEntry.slice_weight_grams) || 0;
    const weightToDeduct = unitWeight * i.quantity;

    const { data: inv } = await supabase
      .from("inventory")
      .select("stock_grams, slices_available")
      .eq("id", i.inventory_id)
      .maybeSingle();
    if (!inv) continue;
    const invAny = inv as { stock_grams?: number | null; slices_available: number };
    const currentGrams = Number(invAny.stock_grams ?? 0);
    const currentSlices = Number(invAny.slices_available ?? 0);
    const newGrams = Math.max(0, currentGrams - weightToDeduct);
    const newSlices = Math.max(0, currentSlices - i.quantity);

    await supabase
      .from("inventory")
      .update({ stock_grams: newGrams, slices_available: newSlices } as Record<string, unknown>)
      .eq("id", i.inventory_id);

    // Se poucas fatias restarem, avisa os donos por WhatsApp.
    if (ownerPhones.length > 0 && newSlices <= 3 && currentSlices > newSlices) {
      const recipeNameKey = [...recipeMap.entries()].find(([, v]) => v.id === i.recipe_id)?.[0] ?? "";
      const recipeName =
        (recipes || []).find((r: any) => (r as { name: string; id: string }).id === i.recipe_id)?.name ||
        recipeNameKey ||
        "produto";
      const alertText = `Alerta de estoque: o produto \"${recipeName}\" está acabando. Restam aproximadamente ${newSlices} fatia(s).`;
      for (const ownerPhone of ownerPhones) {
        try {
          await sendEvolutionMessage(evo.baseUrl, evo.apiKey, evo.instance, ownerPhone, alertText);
        } catch (e) {
          console.error("low-stock alert send error:", (e as Error).message);
        }
      }
    }
  }

  // Marca pedido como finalizado, já que o pagamento foi confirmado no WhatsApp.
  const { error: closeErr } = await supabase
    .from("orders")
    .update({ status: "finalizado" as any, closed_at: new Date().toISOString() })
    .eq("id", orderId);
  if (closeErr) {
    console.error("createOrderFromPayload close order error:", closeErr);
  }

  return { ok: true, orderId };
}

/** Cria encomenda na plataforma a partir do JSON emitido pela IA (após comprovante 50%). */
async function createEncomendaFromPayload(
  supabase: any,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; encomendaId?: string; error?: string }> {
  const customer_name = (payload.customer_name as string)?.trim() || "Cliente WhatsApp";
  const product_description = (payload.product_description as string)?.trim() || "Encomenda";
  const quantity = Math.max(1, Math.floor(Number(payload.quantity) || 1));
  const total_value = Math.max(0, Number(payload.total_value) || 0);
  const payment_method = (payload.payment_method as string)?.toLowerCase() === "credito" ? "credito" : "pix";
  const paid_50_percent = !!payload.paid_50_percent;

  const { data: enc, error } = await supabase
    .from("encomendas")
    .insert({
      customer_name,
      customer_phone: (payload.customer_phone as string) || null,
      product_description,
      quantity,
      total_value,
      address: (payload.address as string) || null,
      payment_method,
      paid_50_percent,
      observations: (payload.observations as string) || null,
      delivery_date: (payload.delivery_date as string) || null,
      delivery_time_slot: (payload.delivery_time_slot as string) || null,
      status: paid_50_percent ? "50_pago" : "pendente",
      source: "whatsapp",
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (error || !enc) {
    console.error("createEncomendaFromPayload:", error);
    return { ok: false, error: (error as Error)?.message };
  }

  // Opcional: registra faturamento da entrada (50% ou valor cheio) como venda simples,
  // para aparecer nos relatórios mesmo sem itens detalhados.
  try {
    const operatorId = await getBotOperatorId(supabase);
    if (operatorId && total_value > 0) {
      const soldAt = new Date().toISOString();
      const depositTotal = paid_50_percent ? total_value / 2 : total_value;
      await supabase.from("sales").insert({
        operator_id: operatorId,
        channel: "balcao",
        payment_method: payment_method as any,
        total: depositTotal,
        order_number: null,
        table_number: null,
        customer_name,
        customer_id: null,
        sold_at: soldAt,
      } as Record<string, unknown>);
    }
  } catch (e) {
    console.error("createEncomendaFromPayload sales insert error:", (e as Error).message);
  }

  // Envia encomenda para a plataforma de notas (TicketFlow) sem bloquear o fluxo principal.
  try {
    await sendTicketFlowOrder(supabase as any, (payload.customer_phone as string) || "", {
      type: "encomenda",
      external_id: (enc as { id: string }).id,
      channel: "encomenda",
      total: total_value,
      payment_method,
      items: [
        {
          name: product_description,
          quantity,
          unit_price: total_value / quantity,
          subtotal: total_value,
        },
      ],
    } as any);
  } catch (e) {
    console.error("createEncomendaFromPayload ticketflow error:", (e as Error).message);
  }

  return { ok: true, encomendaId: (enc as { id: string }).id };
}

/** Quita o restante de uma encomenda (outros 50%), localizando pela combinação telefone + encomenda anterior. */
async function settleEncomendaFromPayload(
  supabase: any,
  payload: Record<string, unknown>,
  customerPhone: string
): Promise<{ ok: boolean; encomendaId?: string; error?: string }> {
  const normalizedPhone = sanitizePhone((payload.customer_phone as string) || customerPhone);
  const paymentValue = Number(payload.payment_value ?? 0);
  const paymentDateRaw = (payload.payment_date as string | undefined)?.trim();
  if (!normalizedPhone || paymentValue <= 0 || !paymentDateRaw) {
    return { ok: false, error: "dados insuficientes para quitar encomenda" };
  }

  // Segurança: só aceita pagamento do dia corrente.
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (paymentDateRaw !== todayStr) {
    console.warn("settleEncomendaFromPayload: payment_date diferente de hoje", paymentDateRaw, todayStr);
    return { ok: false, error: "data do comprovante não é de hoje" };
  }

  // Encontra a encomenda mais recente desse telefone com 50% já pagos e ainda não cancelada.
  const { data: encomendas } = await supabase
    .from("encomendas")
    .select("id, customer_phone, total_value, paid_50_percent, status")
    .eq("customer_phone", normalizedPhone)
    .eq("paid_50_percent", true)
    .neq("status", "cancelado")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!encomendas || encomendas.length === 0) {
    return { ok: false, error: "nenhuma encomenda pendente encontrada para esse telefone" };
  }

  // Tenta casar pelo valor esperado do restante (aprox. metade do total).
  let target = encomendas[0] as { id: string; total_value: number; paid_50_percent: boolean; status: string };
  const candidates = encomendas as { id: string; total_value: number; paid_50_percent: boolean; status: string }[];
  const match = candidates.find((e) => {
    const total = Number(e.total_value || 0);
    if (!total || total <= 0) return false;
    const expectedRest = total / 2;
    const diff = Math.abs(expectedRest - paymentValue);
    // Aceita diferença de até 1 real para arredondamentos.
    return diff <= 1;
  });
  if (match) target = match;

  const total = Number(target.total_value || 0);
  const expectedRest = total > 0 ? total / 2 : paymentValue;

  // Se o valor está muito diferente do esperado (mais de 20% de diferença), não quita automaticamente.
  if (expectedRest > 0) {
    const diffPerc = Math.abs(paymentValue - expectedRest) / expectedRest;
    if (diffPerc > 0.2) {
      console.warn("settleEncomendaFromPayload: valor pago não bate com o restante esperado", {
        paymentValue,
        expectedRest,
      });
      return { ok: false, error: "valor não confere com o restante esperado" };
    }
  }

  // Atualiza a encomenda para status "entregue" (considerando que o restante é normalmente pago na entrega).
  const { error: updErr } = await supabase
    .from("encomendas")
    .update({ status: "entregue" as any })
    .eq("id", target.id);
  if (updErr) {
    console.error("settleEncomendaFromPayload update encomenda error:", updErr);
    return { ok: false, error: (updErr as Error)?.message };
  }

  // Registra a entrada dos outros 50% em sales.
  try {
    const operatorId = await getBotOperatorId(supabase);
    if (operatorId && paymentValue > 0) {
      await supabase.from("sales").insert({
        operator_id: operatorId,
        channel: "balcao",
        payment_method: "pix",
        total: paymentValue,
        order_number: null,
        table_number: null,
        customer_name: null,
        customer_id: null,
        sold_at: new Date().toISOString(),
      } as Record<string, unknown>);
    }
  } catch (e) {
    console.error("settleEncomendaFromPayload sales insert error:", (e as Error).message);
  }

  return { ok: true, encomendaId: target.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient<any>(supabaseUrl, serviceKey);

  try {
    const rawBody = await req.json().catch(() => ({}));
    const payload = rawBody as Record<string, unknown>;

    const event = (payload.event as string) || "";
    const data = (payload.data as Record<string, unknown>) || payload;

    const isMessagesEvent =
      !event ||
      event === "MESSAGES_UPSERT" ||
      event === "messages-upsert" ||
      event === "messages.upsert" ||
      event.toLowerCase().includes("message");
    if (event && !isMessagesEvent) {
      return new Response(JSON.stringify({ ok: true, ignored: event }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = (data.key as { fromMe?: boolean } | undefined) || (payload.key as { fromMe?: boolean } | undefined);
    if (key?.fromMe === true) {
      return new Response(JSON.stringify({ ok: true, ignored: "fromMe" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageId = extractMessageId(data) || extractMessageId(payload as Record<string, unknown>);
    if (messageId) {
      const { data: existing } = await supabase
        .from("webhook_processed_events")
        .select("id")
        .eq("id", messageId)
        .maybeSingle();
      if (existing?.id) {
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch settings including ia_paused
    const { data: settingsRows } = await supabase.from("crm_settings").select("key, value").in("key", [...EVOLUTION_KEYS, "ia_paused"]);
    const evo = getEvolutionConfig(settingsRows || []);

    // ── Validar instância: só responder se o payload vier da instância configurada ──
    const payloadInstance = (
      (data as Record<string, unknown>).instance ||
      (data as Record<string, unknown>).instanceName ||
      (payload as Record<string, unknown>).instance ||
      (payload as Record<string, unknown>).instanceName ||
      ""
    ) as string;
    if (
      evo.instance &&
      evo.instance !== "default" &&
      payloadInstance &&
      payloadInstance !== evo.instance
    ) {
      console.log(`[webhook] Ignorando: instância do payload "${payloadInstance}" ≠ configurada "${evo.instance}"`);
      return new Response(JSON.stringify({ ok: true, ignored: "wrong_instance" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const headerSecret = req.headers.get("x-webhook-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
    const querySecret = new URL(req.url || "", "http://x").searchParams.get("secret");
    if (!verifyWebhookSecret(evo.webhookSecret, headerSecret, querySecret)) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyForJid = data.key ?? payload.key;
    const dataForExtract = keyForJid ? { ...data, key: keyForJid } : data;
    const remoteJid = extractRemoteJid(dataForExtract);
    const normalizedPhone = sanitizePhone(remoteJid);
    if (!normalizedPhone) {
      return new Response(JSON.stringify({ ok: true, invalidPhone: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPayload = (data.message ? data : payload) as Record<string, unknown>;
    let messageText = sanitizeMessage(extractMessageText(fullPayload));
    let pdfText = "";
    if (hasPdfDocument(fullPayload)) {
      const pdfBytes = await getDocumentBytes(fullPayload, { baseUrl: evo.baseUrl, apiKey: evo.apiKey, instance: evo.instance });
      if (pdfBytes) pdfText = await extractTextFromPdf(pdfBytes);
    }
    const fullMessage = pdfText
      ? (messageText ? `${messageText}\n\n[Conteúdo do PDF anexado]:\n${pdfText}` : `O usuário enviou um documento PDF.\n\n[Conteúdo do PDF]:\n${pdfText}`)
      : messageText;
    if (!fullMessage || !fullMessage.trim()) {
      return new Response(JSON.stringify({ ok: true, noText: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!evo.baseUrl || !evo.apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Evolution not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isAllowedEvolutionBaseUrl(evo.baseUrl)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid Evolution URL" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messageId) {
      try { await supabase.from("webhook_processed_events").insert({ id: messageId }); } catch (_) {}
    }

    // ===== DEBOUNCE ATÔMICO: acumular mensagens rápidas =====
    let debounceApplied = false;
    let finalMessage = fullMessage;
    try {
      const { data: debounceResult } = await supabase.rpc("debounce_add_message", {
        p_remote_jid: remoteJid,
        p_message: fullMessage.slice(0, 2000),
        p_delay_ms: 3000,
      });
      if (debounceResult && typeof debounceResult === "object") {
        const dr = debounceResult as { is_leader?: boolean; leader_id?: string; delay_ms?: number };
        if (dr.is_leader === false) {
          // Não é líder: outra invocação vai processar tudo
          console.log("evolution-webhook: debounced (not leader) for", remoteJid);
          return new Response(JSON.stringify({ ok: true, debounced: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (dr.is_leader === true && dr.delay_ms && dr.delay_ms > 0 && dr.leader_id) {
          // É líder: esperar delay e coletar mensagens acumuladas
          debounceApplied = true;
          await new Promise((r) => setTimeout(r, dr.delay_ms! + 500));
          const { data: collected } = await supabase.rpc("debounce_collect_messages", {
            p_remote_jid: remoteJid,
            p_leader_id: dr.leader_id,
          });
          if (collected && Array.isArray(collected) && collected.length > 1) {
            finalMessage = (collected as string[]).join("\n");
            console.log("evolution-webhook: debounce collected", collected.length, "messages for", remoteJid);
          }
        }
      }
    } catch (e) {
      // RPCs não existem ou erro — processar normalmente sem debounce
      console.warn("evolution-webhook: debounce RPC fallback:", (e as Error).message);
    }
    // Replace fullMessage references below with finalMessage
    const fullMessageFinal = debounceApplied ? finalMessage : fullMessage;

    const owner = await getOwner(supabase);
    const { data: ownerSettingsRows } = await supabase.from("crm_settings").select("key, value").in("key", ["owner_phones", "owner_phone_override"]);
    const ownerPhonesMap = new Map((ownerSettingsRows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const combined = [ownerPhonesMap.get("owner_phones"), ownerPhonesMap.get("owner_phone_override")].filter(Boolean).join("\n");
    let ownerPhonesList = parseOwnerPhonesList(combined);
    if (owner?.ownerPhone) {
      const n = normalizePhone(owner.ownerPhone);
      if (n.length >= 10 && !ownerPhonesList.includes(n)) ownerPhonesList = [...ownerPhonesList, n];
    }
    const isOwner = ownerPhonesList.length > 0 && isOwnerPhoneInList(normalizedPhone, ownerPhonesList);

    const pushName = sanitizeName((data.pushName as string) || "");

    // Check ia_paused setting
    const allSettingsMap = new Map((settingsRows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const iaPaused = (allSettingsMap.get("ia_paused") || "false").toLowerCase() === "true";

    let reply: string;
    try {
      if (isOwner) {
        // ===== MELHORIA 2: Buscar histórico do dono de messaages log =====
        const { data: ownerHistRows } = await supabase
          .from("messaages log")
          .select("from_me, text")
          .eq("remote_jid", remoteJid)
          .order("id", { ascending: false })
          .limit(12);
        const ownerHistory = (ownerHistRows || [])
          .reverse()
          .map((m: { from_me: boolean | null; text: string | null }) => ({
            role: m.from_me ? "assistant" as const : "user" as const,
            content: (m.text || "").slice(0, 4096),
          }));

        // Salvar mensagem de entrada do dono
        await supabase.from("messaages log").insert({
          remote_jid: remoteJid,
          from_me: false,
          text: fullMessageFinal.slice(0, 4096),
        });

        reply = await runAssistente(supabase, fullMessageFinal, ownerHistory);

        // Salvar resposta de saída para o dono
        await supabase.from("messaages log").insert({
          remote_jid: remoteJid,
          from_me: true,
          text: reply.slice(0, 4096),
        });
      } else {
        const customerId = await findOrCreateCustomer(supabase, normalizedPhone, pushName);
        await findOrCreateLead(supabase, normalizedPhone, pushName, fullMessageFinal);
        const { data: recipeRows } = await supabase
          .from("recipes")
          .select("name, whole_price, sale_price, slice_price")
          .eq("active", true);
        const recipeRowsTyped = ((recipeRows || []) as { name?: string; whole_price?: number | null; sale_price?: number | null; slice_price?: number | null }[])
          .filter((r) => !!r.name);
        const recipeNames = recipeRowsTyped
          .map((r) => (r.name || "").trim())
          .filter((n) => n.length > 0);

        await supabase.from("crm_messages").insert({
          customer_id: customerId,
          message_type: "whatsapp_entrada",
          message_content: fullMessageFinal.slice(0, 4096),
          status: "lida",
          sent_at: new Date().toISOString(),
        });

        // ===== MELHORIA 3: Verificar ia_paused (global) =====
        if (iaPaused) {
          return new Response(JSON.stringify({ ok: true, paused: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // ===== CHECK PER-CUSTOMER: ia_lock_at (owner takeover) =====
        if (customerId) {
          const { data: custLock } = await supabase
            .from("customers")
            .select("ia_lock_at")
            .eq("id", customerId)
            .maybeSingle();
          if (custLock?.ia_lock_at) {
            const lockTime = new Date(custLock.ia_lock_at).getTime();
            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
            if (Date.now() - lockTime < TWENTY_FOUR_HOURS) {
              console.log("evolution-webhook: IA locked for customer", customerId, "- skipping AI response");
              return new Response(JSON.stringify({ ok: true, skipped: "manual_takeover" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            } else {
              // Lock expired, clear it
              await supabase.from("customers").update({ ia_lock_at: null, ia_lock_reason: null } as any).eq("id", customerId);
            }
          }
        }

        // ===== MELHORIA 1: Carregar sessão de conversa =====
        const { data: sessionRow } = await supabase
          .from("sessions")
          .select("*")
          .eq("remote_jid", remoteJid)
          .maybeSingle();

        // Expirar sessões com mais de 24h para evitar contexto obsoleto/antigo
        let sessionMemory: Record<string, unknown> = {};
        if (sessionRow) {
          const updatedAt = sessionRow.updated_at ? new Date(sessionRow.updated_at).getTime() : 0;
          const now = Date.now();
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          if (updatedAt > 0 && (now - updatedAt) > TWENTY_FOUR_HOURS) {
            // Sessão expirada: limpar memory
            await supabase.from("sessions").update({ memory: {}, updated_at: new Date().toISOString() } as any).eq("remote_jid", remoteJid);
            console.log("evolution-webhook: sessão expirada (>24h), memory limpa para", remoteJid);
          } else {
            sessionMemory = (sessionRow.memory as Record<string, unknown>) || {};
          }
        }

        const { data: historyRows } = await supabase
          .from("crm_messages")
          .select("message_type, message_content")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(30);

        let history =
          (historyRows || [])
            .reverse()
            .map((m: { message_type: string; message_content: string | null }) => {
              const role = m.message_type === "whatsapp_saida" ? "assistant" : "user";
              return { role, content: (m.message_content || "").slice(0, 4096) };
            });
        if (history.length > 0) {
          const last = history[history.length - 1];
          if (last.role === "user" && normalizeForCompare(last.content) === normalizeForCompare(fullMessage)) {
            history = history.slice(0, -1);
          }
        }

        // Injetar contexto da sessão se houver pedido em andamento
        let enrichedMessage = fullMessageFinal;
        if (sessionMemory && Object.keys(sessionMemory).length > 0) {
          enrichedMessage = `[CONTEXTO DA SESSÃO ANTERIOR: ${JSON.stringify(sessionMemory).slice(0, 500)}]\n\n${fullMessageFinal}`;
        }
        const recentHistoryHint = buildRecentHistoryHint(history as { role: "user" | "assistant"; content: string }[]);
        const previousQuestionHint = buildPreviousQuestionHint(history as { role: "user" | "assistant"; content: string }[], fullMessageFinal);
        const intent = detectIntent(fullMessageFinal);
        const stage = deriveStage(sessionMemory, intent, fullMessageFinal);
        const controlHint = buildControlHint(intent, stage, sessionMemory);
        if (recentHistoryHint) {
          enrichedMessage = `[RESUMO DO HISTÓRICO RECENTE]\n${recentHistoryHint}\n\n[MENSAGEM ATUAL]\n${enrichedMessage}`;
        }
        if (previousQuestionHint) {
          enrichedMessage = `[CONTINUIDADE DE CONTEXTO]\n${previousQuestionHint}\n\n${enrichedMessage}`;
        }
        const nowSp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const timeHint = `[HORA_ATUAL_SP]\nAgora em São Paulo: ${nowSp}\nUse essa referência para decidir regras de horário e prazo do mesmo dia.\n[/HORA_ATUAL_SP]`;
        enrichedMessage = `${timeHint}\n\n${controlHint}\n\n${enrichedMessage}`;

        const deterministicPriceReply = detectCakePriceIntent(fullMessageFinal, recipeRowsTyped as { name: string; whole_price?: number | null; sale_price?: number | null; slice_price?: number | null }[]);
        if (deterministicPriceReply) {
          reply = deterministicPriceReply;
        } else {
          reply = await runAtendente(supabase, enrichedMessage, pushName || "Cliente", history as { role: "user" | "assistant"; content: string }[]);
        }

        const { replyClean, pedidoJson, encomendaJson, quitarEncomendaJson, atualizarClienteJson, alertaEquipeText } = parseCreateBlocks(reply);
        const decorationText = extractDecorationRequestFromMessage(fullMessageFinal);
        const pedidoJsonWithDecoration = applyDecorationToPedidoPayload(pedidoJson, decorationText);
        const encomendaJsonWithDecoration = applyDecorationToEncomendaPayload(encomendaJson, decorationText);
        const guardedReplyClean = enforceReplyGuardrails(replyClean || reply, recipeNames, fullMessageFinal);

        // ===== MELHORIA 4: Processar ALERTA_EQUIPE =====
        if (alertaEquipeText) {
          // Save to agent_queries table
          try {
            const custRow = existingCustomer || null;
            await admin.from("agent_queries").insert({
              customer_id: custRow?.id || null,
              customer_name: pushName || normalizedPhone,
              customer_phone: normalizedPhone,
              remote_jid: remoteJid,
              query_text: alertaEquipeText,
              status: "pending",
            });
            console.log("agent_queries: saved pending query for", remoteJid);
          } catch (aqErr) {
            console.error("agent_queries insert error:", (aqErr as Error).message);
          }

          // Also notify owners via WhatsApp
          if (ownerPhonesList.length > 0) {
            const alertMsg = `⚠️ Alerta do atendente IA:\n${alertaEquipeText}\n\nCliente: ${pushName || "não identificado"} (${normalizedPhone})\n\n📋 Responda pela plataforma na aba "Consultas"`;
            for (const ownerPhone of ownerPhonesList) {
              try {
                await sendEvolutionMessage(evo.baseUrl, evo.apiKey, evo.instance, ownerPhone, alertMsg);
              } catch (e) {
                console.error("ALERTA_EQUIPE send error:", (e as Error).message);
              }
            }
          }
        }

        if (atualizarClienteJson) {
          const phoneVal = typeof atualizarClienteJson.phone === "string" ? normalizePhone(atualizarClienteJson.phone) : normalizedPhone;
          const parseBirthday = (v: unknown): string | null => {
            if (typeof v !== "string" || !v.trim()) return null;
            const s = v.trim();
            const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
            if (iso) return iso;
            const ddmmyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/) || s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
            if (ddmmyy) {
              const day = ddmmyy[1].padStart(2, "0");
              const month = ddmmyy[2].padStart(2, "0");
              const year = ddmmyy[3].length === 4 ? ddmmyy[3] : "20" + ddmmyy[3];
              return `${year}-${month}-${day}`;
            }
            return null;
          };
          const birthdayVal = parseBirthday(atualizarClienteJson.birthday);
          const { data: cust } = await supabase.from("customers").select("id").eq("phone", phoneVal).limit(1).maybeSingle();
          if (cust?.id) {
            const updates: { name?: string; email?: string; address?: string; birthday?: string } = {};
            if (typeof atualizarClienteJson.name === "string" && atualizarClienteJson.name.trim()) updates.name = sanitizeName(atualizarClienteJson.name.trim());
            if (typeof atualizarClienteJson.email === "string" && atualizarClienteJson.email.trim()) updates.email = atualizarClienteJson.email.trim().slice(0, 255);
            if (typeof atualizarClienteJson.address === "string" && atualizarClienteJson.address.trim()) updates.address = atualizarClienteJson.address.trim().slice(0, 500);
            if (birthdayVal) updates.birthday = birthdayVal;
            if (Object.keys(updates).length > 0) {
              await supabase.from("customers").update(updates).eq("id", cust.id);
              console.log("evolution-webhook: cliente atualizado (cadastro)", cust.id);
            }
          } else {
            const name = typeof atualizarClienteJson.name === "string" ? sanitizeName(atualizarClienteJson.name.trim()) || "Cliente" : (pushName || "Cliente");
            await findOrCreateCustomer(supabase, phoneVal, name);
            const { data: cust2 } = await supabase.from("customers").select("id").eq("phone", normalizePhone(phoneVal)).limit(1).maybeSingle();
            if (cust2?.id) {
              const updates: { name?: string; email?: string; address?: string; birthday?: string } = {};
              if (typeof atualizarClienteJson.name === "string" && atualizarClienteJson.name.trim()) updates.name = sanitizeName(atualizarClienteJson.name.trim());
              if (typeof atualizarClienteJson.email === "string" && atualizarClienteJson.email.trim()) updates.email = atualizarClienteJson.email.trim().slice(0, 255);
              if (typeof atualizarClienteJson.address === "string" && atualizarClienteJson.address.trim()) updates.address = atualizarClienteJson.address.trim().slice(0, 500);
              if (birthdayVal) updates.birthday = birthdayVal;
              if (Object.keys(updates).length > 0) await supabase.from("customers").update(updates).eq("id", cust2.id);
              console.log("evolution-webhook: cliente criado/atualizado (cadastro)", cust2.id);
            }
          }
        }

        // ===== MELHORIA 6: Salvar payment_confirmation COM payload (sem criar pedido ainda) =====
        if (pedidoJsonWithDecoration) {
          try {
            await supabase.from("payment_confirmations").insert({
              customer_name: (pedidoJsonWithDecoration.customer_name as string) || pushName || "Cliente",
              customer_phone: normalizedPhone,
              remote_jid: remoteJid,
              description: JSON.stringify(pedidoJsonWithDecoration.items || []).slice(0, 500),
              type: "pedido",
              channel: "whatsapp",
              status: "pending",
              order_payload: pedidoJsonWithDecoration,
            } as Record<string, unknown>);
            console.log("evolution-webhook: comprovante de pedido salvo para aprovação manual");
          } catch (e) { console.error("payment_confirmation insert:", (e as Error).message); }
        }
        if (encomendaJsonWithDecoration) {
          try {
            await supabase.from("payment_confirmations").insert({
              customer_name: (encomendaJsonWithDecoration.customer_name as string) || pushName || "Cliente",
              customer_phone: normalizedPhone,
              remote_jid: remoteJid,
              description: (encomendaJsonWithDecoration.product_description as string) || "Encomenda",
              type: "encomenda",
              channel: "whatsapp",
              status: "pending",
              order_payload: encomendaJsonWithDecoration,
            } as Record<string, unknown>);
            console.log("evolution-webhook: comprovante de encomenda salvo para aprovação manual");
          } catch (e) { console.error("payment_confirmation insert:", (e as Error).message); }
        }
        if (quitarEncomendaJson) {
          const result = await settleEncomendaFromPayload(supabase, quitarEncomendaJson, normalizedPhone);
          if (result.ok) {
            console.log("evolution-webhook: encomenda quitada na plataforma", result.encomendaId);
          } else {
            console.error("evolution-webhook: falha ao quitar encomenda", result.error);
          }
        }
        reply = guardedReplyClean || replyClean || reply;
        reply = enforceOrderTypeQuestion(reply, intent, stage, fullMessageFinal);

        // ===== MELHORIA 1 + PERSISTÊNCIA: Salvar sessão com dados extraídos =====
        // Extrair dados do pedido da mensagem para persistir na sessão
        const msgNormForMemory = normalizeForCompare(fullMessageFinal);
        const weightMatch = fullMessageFinal.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
        const extractedWeight = weightMatch ? Number(weightMatch[1].replace(",", ".")) : null;
        const mentionedFlavors = recipeNames.filter((n) => msgNormForMemory.includes(normalizeForCompare(n)));
        const mentionsDelivery = msgNormForMemory.includes("delivery");
        const mentionsRetirada = msgNormForMemory.includes("retirada");
        const mentionsEncomenda = msgNormForMemory.includes("encomenda");
        const orderType = mentionsDelivery ? "delivery" : mentionsRetirada ? "retirada" : mentionsEncomenda ? "encomenda" : null;

        const prevMemory = (sessionMemory || {}) as Record<string, unknown>;
        const persistedFlavors = [...new Set([
          ...((prevMemory.flavors as string[]) || []),
          ...mentionedFlavors,
        ])].slice(0, 10);

        const sessionUpdate: Record<string, unknown> = {
          memory: {
            last_message: fullMessageFinal.slice(0, 300),
            last_reply: reply.slice(0, 300),
            last_intent: intent,
            stage,
            updated: new Date().toISOString(),
            // Persistência de dados do pedido
            weight_kg: extractedWeight || (prevMemory.weight_kg as number | null) || null,
            flavors: persistedFlavors.length > 0 ? persistedFlavors : (prevMemory.flavors as string[] | null) || null,
            order_type: orderType || (prevMemory.order_type as string | null) || null,
          },
          customer_name: pushName || (sessionRow as any)?.customer_name || null,
          updated_at: new Date().toISOString(),
        };
        if (sessionRow) {
          await supabase.from("sessions").update(sessionUpdate as any).eq("remote_jid", remoteJid);
        } else {
          try { await supabase.from("sessions").insert({ remote_jid: remoteJid, ...sessionUpdate } as Record<string, unknown>); } catch (_) {}
        }

        await supabase.from("crm_messages").insert({
          customer_id: customerId,
          message_type: "whatsapp_saida",
          message_content: reply,
          status: "enviada",
          sent_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("evolution-webhook process error:", (e as Error).message);
      reply = FALLBACK_REPLY;
    }

    try {
      await sendEvolutionMessage(evo.baseUrl, evo.apiKey, evo.instance, normalizedPhone, reply);
    } catch (e) {
      console.error("evolution-webhook send error:", (e as Error).message);
      return new Response(
        JSON.stringify({ ok: false, error: "Send failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, isOwner }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evolution-webhook error:", (e as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
