/**
 * evolutionApi.ts — Comunicação com a Evolution API (envio de mensagens WhatsApp).
 *
 * SEGURANÇA:
 * - Validação SSRF: apenas HTTPS e hosts públicos são permitidos (via isAllowedEvolutionBaseUrl).
 * - Timeout em todas as requisições para evitar hanging connections.
 * - Números são sanitizados antes do envio.
 * - Mensagens são truncadas a 4096 caracteres (limite do WhatsApp).
 */

import { isAllowedEvolutionBaseUrl } from "./security.ts";

// ── Constantes ──

/** Timeout para envio de mensagem via Evolution (ms). */
const SEND_MESSAGE_TIMEOUT_MS = 12000;

/** Tamanho máximo de mensagem enviada (limite WhatsApp). */
const MAX_OUTGOING_MESSAGE_LENGTH = 4096;

/** Delay mínimo entre mensagens (ms) para parecer digitação humana. */
const MIN_TYPING_DELAY_MS = 1200;

/** Delay máximo entre mensagens (ms). */
const MAX_TYPING_DELAY_MS = 9000;

// ── Funções ──

/**
 * Envia mensagem de texto via Evolution API.
 * SEGURANÇA:
 * - Valida URL contra SSRF
 * - Sanitiza número (apenas dígitos, 10-15 chars)
 * - Trunca mensagem
 * - Timeout com AbortController
 */
export async function sendEvolutionMessage(
  baseUrl: string,
  apiKey: string,
  instance: string,
  number: string,
  text: string
): Promise<void> {
  const num = number.replace(/\D/g, "").slice(-15);
  if (!num || num.length < 10 || !text) return;

  if (!isAllowedEvolutionBaseUrl(baseUrl)) {
    throw new Error("Evolution URL inválida (apenas HTTPS permitido)");
  }

  const url = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;
  const truncatedText = text.slice(0, MAX_OUTGOING_MESSAGE_LENGTH);

  // Delay proporcional ao tamanho da mensagem para parecer humano
  const dynamicDelay = Math.min(
    MAX_TYPING_DELAY_MS,
    Math.max(MIN_TYPING_DELAY_MS, Math.floor(truncatedText.length * 24))
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_MESSAGE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: num,
        text: truncatedText,
        delay: dynamicDelay,
        textMessage: { text: truncatedText },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      throw new Error(`Evolution send failed: ${res.status} ${err.slice(0, 150)}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
