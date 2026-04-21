/**
 * Módulo de segurança: sanitização, validação e proteção contra abusos.
 * Uso em webhooks e agent-chat.
 *
 * MELHORIAS v2:
 * - Timing-safe comparison para webhook secret (anti timing attack).
 * - Blocklist expandida de IPs privados/reservados (SSRF).
 * - Sanitização de null bytes, control chars e unicode zero-width.
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
  const s = String(input)
    .replace(/\0/g, "")           // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, "") // control chars (preserva \n \r \t)
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, "") // zero-width / bidi chars
    .trim();
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
    // Blocklist expandida: localhost, IPs privados, link-local, reserved
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host === "0.0.0.0" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.16.") || host.startsWith("172.17.") ||
      host.startsWith("172.18.") || host.startsWith("172.19.") ||
      host.startsWith("172.20.") || host.startsWith("172.21.") ||
      host.startsWith("172.22.") || host.startsWith("172.23.") ||
      host.startsWith("172.24.") || host.startsWith("172.25.") ||
      host.startsWith("172.26.") || host.startsWith("172.27.") ||
      host.startsWith("172.28.") || host.startsWith("172.29.") ||
      host.startsWith("172.30.") || host.startsWith("172.31.") ||
      host.startsWith("169.254.") || // link-local
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".localhost")
    ) return false;
    if (parsed.protocol !== "https:") return false;
    // Rejeitar se porta não-padrão for usada (potencial bypass)
    if (parsed.port && parsed.port !== "443") return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Comparação timing-safe entre duas strings.
 * Evita timing attacks na verificação do webhook secret.
 * Compara byte a byte com XOR, sem early return.
 *
 * SEGURANÇA:
 * - Rejeita strings vazias (evita falso positivo em 0 === 0).
 * - Padding com valor fixo (0xFF) quando tamanhos diferem (evita NaN de charCodeAt em string vazia).
 * - Usa TextEncoder para obter bytes reais (seguro com multibyte/unicode).
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Rejeitar strings vazias — nunca devem "coincidir"
  if (a.length === 0 || b.length === 0) return false;

  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);

  if (bufA.length !== bufB.length) {
    // Fazer comparação dummy para não vazar info de tamanho via timing
    const len = Math.max(bufA.length, bufB.length);
    let _dummy = 0;
    for (let i = 0; i < len; i++) {
      // Padding com 0xFF (valor fixo, não derivado de input) para evitar falsos positivos
      _dummy |= (bufA[i] ?? 0xFF) ^ (bufB[i] ?? 0xFF);
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/**
 * Verifica segredo do webhook (header ou query) para aceitar apenas chamadas da Evolution.
 * Se configuredSecret for vazio ou parecer texto de placeholder, não exige verificação.
 * Usa comparação timing-safe para evitar timing attacks.
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
  return timingSafeEqual(provided, secret);
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
