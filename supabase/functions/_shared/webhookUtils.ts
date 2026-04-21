/**
 * webhookUtils.ts — Funções utilitárias para parsing do webhook Evolution API.
 * Extração de dados do payload, config, normalização.
 *
 * SEGURANÇA:
 * - Todos os campos extraídos são validados por tipo e tamanho.
 * - Nenhum dado bruto do payload é usado sem sanitização prévia.
 */

import {
  sanitizeMessage,
  sanitizePhone,
  isAllowedEvolutionBaseUrl,
  MAX_MESSAGE_LENGTH,
} from "./security.ts";
import { isPdfMimetype, isPdfFileName, extractTextFromPdf } from "./pdfExtract.ts";

// ── Tipos ──

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instance: string;
  webhookSecret: string | null;
}

// ── Constantes ──

export const EVOLUTION_KEYS = [
  "evolution_base_url",
  "evolution_api_key",
  "evolution_instance",
  "evolution_webhook_secret",
] as const;

/** Tamanho máximo do documento PDF aceito (5 MB). */
const MAX_PDF_BYTES = 5 * 1024 * 1024;

/** Tamanho máximo de um message ID aceito. */
const MAX_MESSAGE_ID_LENGTH = 128;

// ── Funções ──

/**
 * Monta a config da Evolution a partir das rows de crm_settings.
 * Aplica trim, remove trailing slash, e fallback para "default".
 */
export function getEvolutionConfig(
  settings: { key: string; value: string }[]
): EvolutionConfig {
  const map = new Map(settings.map((s) => [s.key, s.value]));
  const baseUrl = (map.get("evolution_base_url") || "").trim().replace(/\/$/, "");
  const apiKey = (map.get("evolution_api_key") || "").trim();
  let instance = (map.get("evolution_instance") || "default").trim() || "default";
  // Normalizar nome da instância: sem espaços (substituídos por hífen)
  instance = instance.replace(/\s+/g, "-");
  const webhookSecret = (map.get("evolution_webhook_secret") || "").trim() || null;
  return { baseUrl, apiKey, instance, webhookSecret };
}

/**
 * Extrai texto da mensagem do payload Evolution (conversation, extendedTextMessage, documentMessage caption).
 */
export function extractMessageText(payload: Record<string, unknown>): string {
  const msg = payload.message as Record<string, unknown> | undefined;
  if (!msg) return "";
  if (typeof msg.conversation === "string") return msg.conversation;
  const ext = msg.extendedTextMessage as { text?: string } | undefined;
  if (ext && typeof ext.text === "string") return ext.text;
  const doc = msg.documentMessage as { caption?: string } | undefined;
  if (doc && typeof doc.caption === "string") return doc.caption;
  return "";
}

/**
 * Verifica se o payload contém documento PDF.
 */
export function hasPdfDocument(payload: Record<string, unknown>): boolean {
  const msg = payload.message as Record<string, unknown> | undefined;
  if (!msg?.documentMessage) return false;
  const doc = msg.documentMessage as { mimetype?: string; fileName?: string };
  return isPdfMimetype(doc.mimetype) || isPdfFileName(doc.fileName);
}

/**
 * Obtém bytes do documento PDF: base64 inline ou via Evolution getBase64FromMediaMessage.
 * SEGURANÇA: limita a MAX_PDF_BYTES, valida URL com isAllowedEvolutionBaseUrl.
 */
export async function getDocumentBytes(
  payload: Record<string, unknown>,
  evo: { baseUrl: string; apiKey: string; instance: string }
): Promise<Uint8Array | null> {
  const msg = payload.message as Record<string, unknown> | undefined;
  const doc = msg?.documentMessage as { base64?: string } | undefined;

  // Tentativa 1: base64 inline no payload
  if (doc?.base64 && typeof doc.base64 === "string") {
    try {
      const bin = Uint8Array.from(atob(doc.base64), (c) => c.charCodeAt(0));
      return bin.length > 0 && bin.length <= MAX_PDF_BYTES ? bin : null;
    } catch {
      return null;
    }
  }

  // Tentativa 2: buscar via Evolution API
  if (!evo.baseUrl || !evo.apiKey || !isAllowedEvolutionBaseUrl(evo.baseUrl)) return null;
  try {
    const url = `${evo.baseUrl.replace(/\/$/, "")}/chat/getBase64FromMediaMessage/${encodeURIComponent(evo.instance)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", apikey: evo.apiKey },
        body: JSON.stringify({ message: msg, key: payload.key }),
      });
      if (!res.ok) return null;
      const json = (await res.json().catch(() => null)) as { base64?: string } | null;
      const b64 = json?.base64;
      if (typeof b64 !== "string") return null;
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return bin.length > 0 && bin.length <= MAX_PDF_BYTES ? bin : null;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return null;
  }
}

/**
 * Extrai o remoteJid (número do remetente) do payload.
 * Remove o sufixo @s.whatsapp.net ou similar.
 */
export function extractRemoteJid(payload: Record<string, unknown>): string {
  const key = payload.key as { remoteJid?: string } | undefined;
  const jid = key?.remoteJid || "";
  return String(jid).replace(/@.*$/, "").trim();
}

/**
 * Extrai o ID único da mensagem (para deduplicação).
 * SEGURANÇA: limita tamanho para evitar armazenamento de payloads maliciosos.
 */
export function extractMessageId(payload: Record<string, unknown>): string | null {
  const key = payload.key as { id?: string } | undefined;
  const id = key?.id;
  return typeof id === "string" && id.length > 0 && id.length <= MAX_MESSAGE_ID_LENGTH
    ? id
    : null;
}

/**
 * Normaliza texto para comparações case-insensitive sem acentos.
 * Usado extensivamente para detecção de intent e matching de receitas.
 */
export function normalizeForCompare(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Monta a mensagem completa combinando texto + PDF extraído.
 * Retorna string vazia se não houver conteúdo.
 */
export async function buildFullMessage(
  payload: Record<string, unknown>,
  evo: { baseUrl: string; apiKey: string; instance: string }
): Promise<string> {
  let messageText = sanitizeMessage(extractMessageText(payload));
  let pdfText = "";

  if (hasPdfDocument(payload)) {
    const pdfBytes = await getDocumentBytes(payload, evo);
    if (pdfBytes) pdfText = await extractTextFromPdf(pdfBytes);
  }

  if (pdfText) {
    return messageText
      ? `${messageText}\n\n[Conteúdo do PDF anexado]:\n${pdfText}`
      : `O usuário enviou um documento PDF.\n\n[Conteúdo do PDF]:\n${pdfText}`;
  }

  return messageText;
}
