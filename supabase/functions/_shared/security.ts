/**
 * Módulo de segurança: sanitização, validação e proteção contra abusos.
 * Uso em webhooks e agent-chat.
 */

/** Tamanho máximo da mensagem do usuário (caracteres). */
export const MAX_MESSAGE_LENGTH = 4096;

/** Tamanho máximo do texto extraído de PDF anexado (caracteres). */
export const MAX_PDF_EXTRACTED_TEXT_LENGTH = 12000;

/** Tamanho máximo do nome/contato. */
export const MAX_NAME_LENGTH = 200;

/** Número máximo de mensagens no histórico enviado ao LLM. */
export const MAX_HISTORY_MESSAGES = 12;

/** Telefone: só dígitos, máx 15 (E.164). */
export const PHONE_MAX_DIGITS = 15;

/**
 * Sanitiza mensagem: trim, limite de tamanho, remove null bytes.
 */
export function sanitizeMessage(input: unknown): string {
  if (input == null) return "";
  const s = String(input).replace(/\0/g, "").trim();
  return s.slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Sanitiza nome/contato para exibição e contexto.
 */
export function sanitizeName(input: unknown): string {
  if (input == null) return "";
  const s = String(input).replace(/\0/g, "").trim();
  return s.slice(0, MAX_NAME_LENGTH);
}

/**
 * Normaliza e valida telefone: apenas dígitos, até PHONE_MAX_DIGITS.
 * Retorna string vazia se inválido.
 */
export function sanitizePhone(input: unknown): string {
  if (input == null) return "";
  const digits = String(input).replace(/\D/g, "");
  const normalized = digits.slice(-PHONE_MAX_DIGITS);
  return normalized.length >= 10 ? normalized : "";
}

/**
 * Valida URL da Evolution para evitar SSRF (apenas HTTPS, sem localhost/IP privado).
 */
export function isAllowedEvolutionBaseUrl(url: string): boolean {
  const u = url.trim().replace(/\/$/, "");
  if (!u.startsWith("https://")) return false;
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.") || host.startsWith("10.") || host.endsWith(".local")) return false;
    if (parsed.protocol !== "https:") return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica segredo do webhook (header ou query) para aceitar apenas chamadas da Evolution.
 * Se configuredSecret for vazio ou parecer texto de placeholder, não exige verificação.
 */
export function verifyWebhookSecret(
  configuredSecret: string | null | undefined,
  requestHeader: string | null,
  requestQuery: string | null
): boolean {
  let secret = (configuredSecret ?? "").trim();
  if (secret.length > 60 || /header|evolution|opcional|na evolution/i.test(secret)) secret = "";
  if (!secret) return true;
  const provided = (requestHeader || requestQuery || "").trim();
  if (!provided) return false;
  return provided === secret;
}

/**
 * Sanitiza histórico de mensagens para o LLM.
 */
export function sanitizeHistory(
  raw: unknown
): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: string }).role;
    if (role !== "user" && role !== "assistant") continue;
    const content = sanitizeMessage((m as { content?: unknown }).content);
    if (content) out.push({ role, content });
    if (out.length >= MAX_HISTORY_MESSAGES) break;
  }
  return out;
}
