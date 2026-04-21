/**
 * priceEngine.ts — Motor de cálculo de preços, guardrails de recomendação e decoração.
 *
 * SEGURANÇA:
 * - Preços são calculados deterministicamente (sem confiar no LLM).
 * - Nomes de receitas são escapados antes de uso em regex.
 * - Strings do usuário são truncadas para evitar payloads excessivos.
 */

import { normalizeForCompare } from "./webhookUtils.ts";

/** Link fixo do cardápio completo em PDF (Drive). */
const CARDAPIO_PDF_URL = "http://bit.ly/3OYW9Fw";

// ── Tipos ──

export interface RecipeForPrice {
  name: string;
  whole_price?: number | null;
  sale_price?: number | null;
  slice_price?: number | null;
}

// ── Funções de preço ──

/**
 * Divide peso acima de 4kg em múltiplos bolos (limite da forma).
 */
export function splitAboveFourKg(totalKg: number): number[] {
  const parts: number[] = [];
  let rem = totalKg;
  while (rem > 4) {
    parts.push(4);
    rem -= 4;
  }
  if (rem > 0) parts.push(rem);
  return parts;
}

/**
 * Detecta pergunta de preço de bolo e calcula valor determinístico.
 * Retorna null se não for pergunta de preço ou se o bolo não for encontrado.
 */
export function detectCakePriceIntent(
  fullMessage: string,
  recipes: RecipeForPrice[]
): string | null {
  const msgNorm = normalizeForCompare(fullMessage);
  const asksPrice =
    msgNorm.includes("preco") || msgNorm.includes("valor") || msgNorm.includes("quanto");
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
    const inferior = Math.floor(kg);
    const superior = Math.ceil(kg);
    return `A gente trabalha com peso inteiro! Quer que seja de ${inferior}kg (R$ ${(inferior * matched.price).toFixed(2)}) ou ${superior}kg (R$ ${(superior * matched.price).toFixed(2)})? 😊`;
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

// ── Guardrails de recomendação ──

/**
 * Extrai menções a "bolo de [sabor]" de um texto.
 */
export function extractBoloRecommendations(text: string): string[] {
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

/**
 * Verifica se a resposta menciona bolo que não existe no cardápio.
 */
export function hasInvalidRecommendation(
  replyText: string,
  recipeNames: string[]
): boolean {
  const normalizedRecipes = recipeNames.map((n) => normalizeForCompare(n));
  const candidates = extractBoloRecommendations(replyText).map((c) =>
    normalizeForCompare(c)
  );
  if (candidates.length === 0) return false;
  for (const candidate of candidates) {
    const found = normalizedRecipes.some(
      (r) => r === candidate || r.includes(candidate) || candidate.includes(r)
    );
    if (!found) return true;
  }
  return false;
}

/**
 * Aplica guardrails na resposta: remove menções a bolos inventados pelo LLM.
 * Se o LLM alucineu um sabor, substitui por sugestões reais do cardápio.
 */
export function enforceReplyGuardrails(
  replyText: string,
  recipeNames: string[],
  fullMessage: string
): string {
  if (!replyText || recipeNames.length === 0) return replyText;

  if (hasInvalidRecommendation(replyText, recipeNames)) {
    const msg = normalizeForCompare(fullMessage);
    const askedRecommendation =
      msg.includes("recomenda") ||
      msg.includes("sugere") ||
      msg.includes("sugestao") ||
      msg.includes("sugestão") ||
      msg.includes("qual bolo") ||
      msg.includes("qual outro") ||
      msg.includes("teria outro") ||
      msg.includes("o que tem");

    if (askedRecommendation) {
      const top = recipeNames.slice(0, 5).join(", ");
      return `Os mais pedidos aqui são: ${top} 😊\nQuer saber o preço de algum? Ou posso te enviar o cardápio completo: ${CARDAPIO_PDF_URL}`;
    } else {
      const invalidCakes = extractBoloRecommendations(replyText).filter((c) => {
        const norm = normalizeForCompare(c);
        return !recipeNames.some((r) => {
          const rn = normalizeForCompare(r);
          return rn === norm || rn.includes(norm) || norm.includes(rn);
        });
      });

      let cleaned = replyText;
      for (const inv of invalidCakes) {
        cleaned = cleaned.replace(
          new RegExp(inv.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
          "[produto do cardápio]"
        );
      }

      if (invalidCakes.length > 0) {
        const top = recipeNames.slice(0, 4).join(", ");
        cleaned += `\n\nNossos sabores disponíveis incluem: ${top}. Quer ver o cardápio completo?`;
      }
      return cleaned;
    }
  }

  return replyText;
}

// ── Decoração ──

/**
 * Extrai pedido de decoração da mensagem do cliente.
 */
export function extractDecorationRequestFromMessage(
  fullMessage: string
): string | null {
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

/**
 * Adiciona informação de decoração aos itens do pedido.
 */
export function applyDecorationToPedidoPayload(
  pedidoJson: Record<string, unknown> | null,
  decorationText: string | null
): Record<string, unknown> | null {
  if (!pedidoJson || !decorationText) return pedidoJson;
  const items =
    (pedidoJson.items as Array<Record<string, unknown>> | undefined) || [];
  if (items.length === 0) return pedidoJson;
  const mapped = items.map((it) => {
    const note = typeof it.notes === "string" ? it.notes.trim() : "";
    const line = `Decoração solicitada (mensagem do cliente): "${decorationText}"`;
    if (note) return { ...it, notes: `${note} | ${line}`.slice(0, 500) };
    return { ...it, notes: line.slice(0, 500) };
  });
  return { ...pedidoJson, items: mapped };
}

/**
 * Adiciona informação de decoração à encomenda.
 */
export function applyDecorationToEncomendaPayload(
  encomendaJson: Record<string, unknown> | null,
  decorationText: string | null
): Record<string, unknown> | null {
  if (!encomendaJson || !decorationText) return encomendaJson;
  const obs =
    typeof encomendaJson.observations === "string"
      ? encomendaJson.observations.trim()
      : "";
  const line = `Decoração solicitada (mensagem do cliente): "${decorationText}"`;
  const merged = obs ? `${obs} | ${line}` : line;
  return { ...encomendaJson, observations: merged.slice(0, 500) };
}
