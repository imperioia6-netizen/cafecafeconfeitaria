/**
 * teamAlerts.ts — Alertas automáticos para a equipe humana.
 *
 * Três cenários (definidos pelo proprietário):
 *
 * 1. COMPROVANTE RECEBIDO — cliente enviou PDF/imagem de pagamento.
 *    Equipe precisa ver o resumo do pedido + comprovante pra APROVAR ou
 *    REJEITAR na plataforma. Não confiamos só na IA registrar.
 *
 * 2. VITRINE DO DIA — cliente pergunta "tem bolo pronto?", "fatia do dia?",
 *    "quais sabores prontos hoje?". Isso varia diariamente, a IA não sabe.
 *    Equipe responde diretamente.
 *
 * 3. IA NÃO SOUBE — a IA respondeu "vou verificar com a equipe". Isso é
 *    sinal de que precisa ser humano. Avisa a equipe com a pergunta original.
 *
 * Dedup por tipo dentro de 30 min (evita spammar dono quando cliente manda
 * o mesmo tipo de msg várias vezes).
 */

import { normalizeForCompare } from "./webhookUtils.ts";

// ── Tipos ──

export type TeamAlertKind = "proof" | "vitrine" | "llm_checks";

export interface TeamAlertContext {
  kind: TeamAlertKind;
  clientName: string;
  clientPhone: string;
  clientMessage: string;
  /** Para "proof": resumo do último pedido pendente (se houver). */
  lastPedidoSummary?: string;
  /** Para "llm_checks": a resposta da IA que mencionou consultar equipe. */
  iaReply?: string;
}

export interface TeamAlertResult {
  alert: TeamAlertKind | null;
  message: string;
}

// ── Detectores ──

/**
 * Cliente está perguntando sobre produtos disponíveis NA VITRINE DO DIA?
 * Varia diariamente — só a equipe sabe.
 *
 * Abordagem: co-ocorrência de (A) produto + (B) "pronto/hoje/vitrine/do dia"
 * + (C) marcador de pergunta. Mais robusto que regex com muitas variações.
 */
export function asksAboutVitrine(msg: string): boolean {
  const n = normalizeForCompare(msg);
  if (!n) return false;

  // Exceção imediata: se menciona encomenda ou prazo futuro, NÃO é vitrine
  // (cliente sabe que é sob demanda).
  if (
    /\bencomenda\b/.test(n) ||
    /\bpra\s+amanh\w*|pra\s+depois|pra\s+segund|pra\s+terc|pra\s+quart|pra\s+quint|pra\s+sext|pra\s+sabad|pra\s+doming/.test(
      n
    )
  ) {
    return false;
  }

  // Caso 1 — palavra "vitrine" explícita = pergunta óbvia
  if (/\bvitrine\b/.test(n)) return true;

  // Caso 2 — "pronto pra levar/buscar/pegar" implica algo da vitrine
  if (
    /\bpronto[s]?\s+(?:pra|para)\s+(?:levar|buscar|pegar|retirar|hoje|agora)\b/.test(
      n
    )
  ) {
    return true;
  }
  if (
    /\b(?:tem|t[eê]m)\s+algo\s+pronto\b/.test(n) ||
    /\bo\s+que\s+tem\s+(?:pronto|hoje)\b/.test(n)
  ) {
    return true;
  }

  // Caso 3 — produto (bolo/fatia/sabor) + marcador de vitrine + pergunta
  const mentionsProduct =
    /\b(bolos?|fatias?|sabor(?:es)?|produtos?|salgados?|docinhos?)\b/.test(n);
  if (!mentionsProduct) return false;

  const mentionsTodayOrReady =
    /\b(pronto|pronta|prontos|prontas|hoje|hj|do\s+dia|dispon[ií]ve[il]s?|agora|na\s+hora)\b/.test(
      n
    );
  if (!mentionsTodayOrReady) return false;

  const isQuestion =
    /\?/.test(n) ||
    /\bqual(?:is)?\b|\bo\s+que\b|\btem\b|\bt[eê]m\b|\btao\b/.test(n);
  return isQuestion;
}

/**
 * A resposta da IA indica que ela NÃO soube responder e vai consultar
 * a equipe? (Não conta "vou verificar" em contexto de sabor fora do
 * cardápio — esse é esperado.)
 */
export function llmSaysCheckingTeam(reply: string): boolean {
  const r = normalizeForCompare(reply);
  if (!r) return false;
  return (
    r.includes("vou verificar com a equipe") ||
    r.includes("vou ver com a equipe") ||
    r.includes("vou consultar a equipe") ||
    r.includes("verificar se conseguimos") ||
    r.includes("ver se conseguimos") ||
    r.includes("deixe-me verificar") ||
    r.includes("deixa eu verificar isso") ||
    r.includes("preciso verificar isso")
  );
}

// ── Dedup por sessão ──

/**
 * Verifica se já emitimos alerta do mesmo tipo nos últimos `windowMinutes`.
 * Retorna true se PODE alertar (não houve alerta recente).
 */
export function canAlertNow(
  sessionMemory: Record<string, unknown> | undefined,
  kind: TeamAlertKind,
  windowMinutes = 30
): boolean {
  if (!sessionMemory) return true;
  const key = `last_team_alert_${kind}_at`;
  const lastRaw = sessionMemory[key] as string | undefined;
  if (!lastRaw) return true;
  const last = new Date(lastRaw).getTime();
  if (!Number.isFinite(last)) return true;
  const diffMs = Date.now() - last;
  return diffMs > windowMinutes * 60 * 1000;
}

/**
 * Marca alerta como enviado. Retorna objeto pra mesclar em sessionMemory.
 */
export function markAlertSent(kind: TeamAlertKind): Record<string, string> {
  return { [`last_team_alert_${kind}_at`]: new Date().toISOString() };
}

// ── Construtor de mensagem ──

/**
 * Monta a mensagem que vai pros donos via WhatsApp.
 */
export function buildTeamAlertMessage(ctx: TeamAlertContext): string {
  const safeName = (ctx.clientName || "Cliente").slice(0, 80);
  const safePhone = ctx.clientPhone || "—";
  const safeMsg = (ctx.clientMessage || "").slice(0, 500);

  switch (ctx.kind) {
    case "proof": {
      const resumo =
        (ctx.lastPedidoSummary || "").trim() || "(resumo do pedido não encontrado na memória)";
      return (
        `📎 COMPROVANTE RECEBIDO — AÇÃO DA EQUIPE\n\n` +
        `Cliente: ${safeName} (${safePhone})\n\n` +
        `📝 Pedido:\n${resumo.slice(0, 1200)}\n\n` +
        `👉 Por favor, confira o comprovante no painel e APROVE ou REJEITE o pedido.`
      );
    }
    case "vitrine": {
      return (
        `🍰 DÚVIDA SOBRE VITRINE DO DIA\n\n` +
        `Cliente: ${safeName} (${safePhone})\n\n` +
        `💬 Mensagem: "${safeMsg}"\n\n` +
        `👉 Cliente quer saber o que tem PRONTO na vitrine hoje (sabores/fatias/bolos). A IA não sabe, por favor responda direto.`
      );
    }
    case "llm_checks": {
      const iaLine = (ctx.iaReply || "").slice(0, 300);
      return (
        `❓ IA NÃO SOUBE RESPONDER — AJUDA DA EQUIPE\n\n` +
        `Cliente: ${safeName} (${safePhone})\n\n` +
        `💬 Pergunta: "${safeMsg}"\n\n` +
        (iaLine ? `🤖 Resposta da IA: "${iaLine}"\n\n` : "") +
        `👉 A IA disse que ia verificar com a equipe. Por favor, responda o cliente direto.`
      );
    }
  }
}

// ── Decisor principal ──

export interface DecideParams {
  gotPdfDocument: boolean;
  clientMessage: string;
  iaReply: string;
  sessionMemory?: Record<string, unknown>;
}

/**
 * Decide se algum alerta deve ser disparado. Prioridade:
 *   1. Comprovante (PDF) — mais urgente, cliente já pagou
 *   2. Vitrine do dia — cliente esperando resposta
 *   3. IA não soube — genérico
 *
 * Retorna o tipo do primeiro alerta APLICÁVEL + não-duplicado. Se nenhum,
 * retorna null.
 */
export function decideTeamAlert(p: DecideParams): TeamAlertKind | null {
  if (p.gotPdfDocument && canAlertNow(p.sessionMemory, "proof")) {
    return "proof";
  }
  if (
    asksAboutVitrine(p.clientMessage) &&
    canAlertNow(p.sessionMemory, "vitrine", 60)
  ) {
    return "vitrine";
  }
  if (
    llmSaysCheckingTeam(p.iaReply) &&
    canAlertNow(p.sessionMemory, "llm_checks", 60)
  ) {
    return "llm_checks";
  }
  return null;
}
