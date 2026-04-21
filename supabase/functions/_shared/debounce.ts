/**
 * debounce.ts — Agrupamento de mensagens rápidas do WhatsApp.
 * Implementa debounce atômico via RPC Postgres (SELECT ... FOR UPDATE).
 *
 * PROBLEMA: No WhatsApp as pessoas mandam várias mensagens seguidas
 * (ex: "Oi" / "quero pedir" / "bolo de 4kg"). Sem debounce, cada uma
 * geraria uma resposta separada, confundindo o cliente.
 *
 * SOLUÇÃO: O primeiro request se torna "líder", espera um período,
 * e coleta todas as mensagens que chegaram. Os demais retornam imediatamente.
 *
 * SEGURANÇA:
 * - RPC atômico no Postgres (FOR UPDATE) evita race conditions.
 * - Fallback gracioso se o RPC não existir (migration pendente).
 * - Mensagens coletadas são validadas como strings.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Constantes ──

/** Tempo de espera para agrupar mensagens rápidas (ms). */
export const DEBOUNCE_MS = 4000;

// ── Tipos ──

export interface DebounceResult {
  shouldProcess: boolean;
  allMessages: string[];
}

// ── Funções ──

/**
 * Debounce atômico via RPC Postgres.
 * Resolve race condition: garante que apenas UM request se torna "líder".
 */
export async function debounceMessage(
  supabase: SupabaseClient,
  remoteJid: string,
  messageText: string
): Promise<DebounceResult> {
  // 1. Chamar RPC atômico — Postgres decide quem é líder com FOR UPDATE
  const { data: addResult, error: addErr } = await supabase.rpc(
    "debounce_add_message",
    {
      p_remote_jid: remoteJid,
      p_message: messageText,
      p_debounce_ms: DEBOUNCE_MS,
    }
  );

  if (addErr) {
    // Fallback: se RPC não existe ainda (migration pendente), processar direto
    console.warn(
      "debounce_add_message RPC error (migration pendente?):",
      addErr.message
    );
    return { shouldProcess: true, allMessages: [messageText] };
  }

  const isLeader =
    (addResult as { is_leader?: boolean })?.is_leader ?? true;
  const debounceMs =
    (addResult as { debounce_ms?: number })?.debounce_ms ?? DEBOUNCE_MS;

  if (!isLeader) {
    // Outro request é o líder — esta mensagem já está no buffer
    return { shouldProcess: false, allMessages: [] };
  }

  // 2. Somos o líder — esperar o período de debounce
  await new Promise((resolve) => setTimeout(resolve, debounceMs));

  // 3. Coletar TODAS as mensagens que chegaram durante a espera
  const { data: messages, error: collectErr } = await supabase.rpc(
    "debounce_collect_messages",
    { p_remote_jid: remoteJid }
  );

  if (collectErr) {
    console.warn("debounce_collect_messages RPC error:", collectErr.message);
    return { shouldProcess: true, allMessages: [messageText] };
  }

  const allMessages: string[] = Array.isArray(messages)
    ? messages.filter((m: unknown) => typeof m === "string")
    : [messageText];

  // Fallback: pelo menos a mensagem original
  if (allMessages.length === 0) {
    return { shouldProcess: true, allMessages: [messageText] };
  }

  return { shouldProcess: true, allMessages };
}
