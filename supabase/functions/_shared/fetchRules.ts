/**
 * fetchRules.ts — Busca regras do banco agent_rules baseado no intent/stage.
 *
 * Em vez de carregar TODAS as regras no prompt (causando "esquecimento" do LLM),
 * busca apenas as regras relevantes para o contexto atual da conversa.
 *
 * Regras com `sempre_ativa = true` são SEMPRE incluídas.
 * Regras com intents/stages específicos só são incluídas quando batem com o contexto.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { PromptIntent, PromptStage } from "./atendentePromptModules.ts";

export interface AgentRule {
  id: number;
  categoria: string;
  titulo: string;
  conteudo: string;
  prioridade: string;
  intents: string[];
  stages: string[];
  sempre_ativa: boolean;
  ordem: number;
}

/** Prioridade para ordenação */
const PRIORIDADE_PESO: Record<string, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

/**
 * Busca regras relevantes do banco `agent_rules`.
 *
 * Lógica:
 * 1. Regras com `sempre_ativa = true` → SEMPRE incluídas
 * 2. Regras cujo array `intents` contém o intent atual → incluídas
 * 3. Regras cujo array `stages` contém o stage atual → incluídas
 * 4. Regras com intents e stages vazios que NÃO são sempre_ativa → NÃO incluídas
 *    (evita carregar tudo)
 *
 * Ordena por: prioridade (critica primeiro) → ordem → id
 */
export async function fetchRelevantRules(
  supabase: SupabaseClient,
  intent: PromptIntent,
  stage: PromptStage,
  hasOrderInProgress: boolean
): Promise<AgentRule[]> {
  // Buscar todas as regras ativas do banco (são poucas, ~15-20 linhas)
  const { data: allRules, error } = await supabase
    .from("agent_rules")
    .select("id, categoria, titulo, conteudo, prioridade, intents, stages, sempre_ativa, ordem")
    .eq("ativa", true)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("fetchRelevantRules error:", error.message);
    return [];
  }

  const rules = (allRules || []) as AgentRule[];

  // Filtrar regras relevantes
  const relevant = rules.filter((rule) => {
    // Sempre ativa → sempre incluída
    if (rule.sempre_ativa) return true;

    // Verificar match por intent
    const matchIntent =
      rule.intents.length === 0 || rule.intents.includes(intent);

    // Verificar match por stage
    const matchStage =
      rule.stages.length === 0 || rule.stages.includes(stage);

    // Se ambos intents e stages são vazios e NÃO é sempre_ativa → não incluir
    // (isso evita que regras "órfãs" sejam carregadas em todo contexto)
    if (rule.intents.length === 0 && rule.stages.length === 0) {
      return false; // já tratado por sempre_ativa acima
    }

    // Incluir se bate com intent OU stage
    return matchIntent || matchStage;
  });

  // Se tem pedido em andamento, garantir que continuidade está presente
  if (hasOrderInProgress) {
    const hasContinuidade = relevant.some(
      (r) => r.categoria === "continuidade"
    );
    if (!hasContinuidade) {
      const continuidadeRule = rules.find(
        (r) => r.categoria === "continuidade"
      );
      if (continuidadeRule) relevant.push(continuidadeRule);
    }
  }

  // Ordenar: prioridade (critica primeiro) → ordem → id
  relevant.sort((a, b) => {
    const pa = PRIORIDADE_PESO[a.prioridade] ?? 2;
    const pb = PRIORIDADE_PESO[b.prioridade] ?? 2;
    if (pa !== pb) return pa - pb;
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return a.id - b.id;
  });

  return relevant;
}

/**
 * Monta o bloco de regras para o system prompt.
 * Cada regra vira uma seção com título e conteúdo.
 */
export function buildRulesBlock(rules: AgentRule[]): string {
  if (rules.length === 0) return "";

  return rules
    .map((r) => {
      const prioLabel =
        r.prioridade === "critica"
          ? "⚠️ PRIORIDADE CRÍTICA"
          : r.prioridade === "alta"
          ? "🔴 PRIORIDADE ALTA"
          : "";
      const header = prioLabel
        ? `═══ ${r.titulo.toUpperCase()} ${prioLabel} ═══`
        : `═══ ${r.titulo.toUpperCase()} ═══`;
      return `${header}\n${r.conteudo}`;
    })
    .join("\n\n");
}

/**
 * Versão completa: busca regras + monta o bloco de texto.
 */
export async function fetchAndBuildRules(
  supabase: SupabaseClient,
  intent: PromptIntent,
  stage: PromptStage,
  hasOrderInProgress: boolean
): Promise<string> {
  const rules = await fetchRelevantRules(
    supabase,
    intent,
    stage,
    hasOrderInProgress
  );
  return buildRulesBlock(rules);
}
