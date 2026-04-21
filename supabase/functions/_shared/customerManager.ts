/**
 * customerManager.ts — Gerenciamento de clientes e leads (CRM).
 * Criação/atualização de customers e social_leads a partir do WhatsApp.
 *
 * SEGURANÇA:
 * - Todos os inputs são sanitizados antes de inserção no banco.
 * - Phone é normalizado via normalizePhone (apenas dígitos, tamanho controlado).
 * - Nomes são sanitizados via sanitizeName (truncados, sem null bytes).
 * - Nenhum match fuzzy por últimos N dígitos (evita contaminação cross-cliente).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhone } from "./getOwner.ts";
import { sanitizeName } from "./security.ts";

// ── Funções ──

/**
 * Encontra ou cria customer pelo telefone normalizado.
 * Retorna o ID do customer.
 */
export async function findOrCreateCustomer(
  supabase: SupabaseClient,
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

/**
 * Sugere status do lead com base no conteúdo da mensagem.
 * Mapeia palavras-chave para estágios do funil (novo_lead → em_negociacao → proposta_aceita).
 */
export function getSuggestedLeadStatus(
  currentStatus: string | null,
  message: string
): string {
  const base = currentStatus || "novo_lead";
  const txt = message.toLowerCase();

  // Conversa fechada / pagamento
  if (
    txt.includes("fechado") ||
    txt.includes("fechou") ||
    txt.includes("confirmo") ||
    txt.includes("confirmar") ||
    txt.includes("pagar") ||
    txt.includes("pagamento") ||
    txt.includes("pix")
  ) {
    return "proposta_aceita";
  }

  // Negociação
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

  return base;
}

/**
 * Encontra ou cria lead no social_leads.
 * Atualiza estágio automaticamente com base no conteúdo da mensagem.
 */
export async function findOrCreateLead(
  supabase: SupabaseClient,
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
    if (nextStatus !== existing.status) {
      await supabase
        .from("social_leads")
        .update({ status: nextStatus, stage_changed_at: now } as Record<string, unknown>)
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
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (error) return null;
  return created?.id ?? null;
}
