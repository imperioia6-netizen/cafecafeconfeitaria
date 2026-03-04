import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface OwnerInfo {
  ownerUserId: string;
  ownerPhone: string | null;
}

/**
 * Obtém user_id e telefone do dono (único registro em user_roles com role = 'owner').
 * Usa service role. Retorna null se não houver dono.
 */
export async function getOwner(supabase: SupabaseClient): Promise<OwnerInfo | null> {
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  if (!roleRow?.user_id) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, phone")
    .eq("user_id", roleRow.user_id)
    .maybeSingle();
  if (!profile) return { ownerUserId: roleRow.user_id, ownerPhone: null };
  return { ownerUserId: profile.user_id, ownerPhone: profile.phone ?? null };
}

/** Normaliza número (apenas dígitos, últimos 11). O + é opcional ao digitar. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-11) || phone;
}

/**
 * Parseia string com vários números (vírgula ou quebra de linha; + opcional).
 * Retorna array de números normalizados (apenas os com >= 10 dígitos).
 */
export function parseOwnerPhonesList(value: string | null | undefined): string[] {
  if (!value || typeof value !== "string") return [];
  const parts = value.split(/[\n,;]+/).map((s) => normalizePhone(s.trim()));
  return [...new Set(parts)].filter((p) => p.length >= 10);
}

/** Verifica se o número do remetente está na lista de donos. */
export function isOwnerPhoneInList(remotePhone: string, ownerPhonesList: string[]): boolean {
  if (ownerPhonesList.length === 0) return false;
  const normalized = normalizePhone(remotePhone);
  if (normalized.length < 10) return false;
  return ownerPhonesList.some((owner) => normalizePhone(owner) === normalized);
}

/** Verifica se o número do remetente é o do dono (perfil ou override em crm_settings). Mantido para compat. */
export function isOwnerPhone(
  remotePhone: string,
  ownerPhone: string | null,
  settingsOverride: string | null
): boolean {
  const list: string[] = [];
  if (settingsOverride?.trim()) list.push(settingsOverride.trim());
  if (ownerPhone?.trim()) list.push(ownerPhone.trim());
  return isOwnerPhoneInList(remotePhone, list);
}
