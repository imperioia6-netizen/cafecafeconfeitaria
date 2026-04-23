import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeMessage, sanitizeHistory, MAX_MESSAGE_LENGTH } from "./security.ts";
// buildAtendenteBasePrompt import removido — era usado apenas pelo dead code buildAtendentePrompt()
import {
  buildModularAtendentePrompt,
  type PromptIntent,
  type PromptStage,
} from "./atendentePromptModules.ts";
import { fetchAndBuildRules } from "./fetchRules.ts";
import { buildDecisionContext, buildSmartPrompt, detectEntities } from "./decisionLayer.ts";
import type { Intent } from "./routeNotes.ts";
import type { RecipeInfo } from "./calculator.ts";

/** Timeout para chamada ao LLM (ms). */
const LLM_TIMEOUT_MS = 45000;
/** Quantas tentativas (incluindo a primeira) antes de desistir. */
const LLM_MAX_ATTEMPTS = 2;
/** Delay entre tentativas (ms). */
const LLM_RETRY_DELAY_MS = 1200;

/** Resposta padrão quando a IA falha (assistente). */
const FALLBACK_ASSISTENTE = "No momento não consegui processar. Pode repetir em poucos segundos ou ver os dados direto no painel.";

/** Resposta padrão quando a IA falha (atendente). */
const FALLBACK_ATENDENTE = "Obrigado pela mensagem! Nossa equipe já foi avisada e em breve retorna. Qualquer dúvida, estamos à disposição.";

/**
 * Capacidades de dados que o agente pode usar.
 * - Usado pelo `agent-chat` (dono) e pelo `evolution-webhook` (quando falar com o dono).
 * - Para adicionar novas áreas (ex.: metas, financeiro), incluir aqui e tratar em `buildDataContext`.
 */
export const CAPABILITIES = [
  "reports",
  "sales",
  "stock",
  "employees",
  "clients",
  "demands",
  "offers",
  "crm_kanban",
] as const;

export async function buildDataContext(
  supabase: SupabaseClient,
  capabilities: readonly string[]
): Promise<Record<string, unknown>> {
  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);
  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);
  const start7Str = start7.toISOString();
  const start30Str = start30.toISOString();
  const nowStr = now.toISOString();
  const ctx: Record<string, unknown> = {};

  if (capabilities.includes("reports") || capabilities.includes("sales")) {
    const [salesRes, prevRes] = await Promise.all([
      supabase.from("sales").select("total, payment_method, channel, sold_at").gte("sold_at", start30Str).lte("sold_at", nowStr),
      supabase.from("sales").select("total").gte("sold_at", new Date(start30.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()).lt("sold_at", start30Str),
    ]);
    const current = (salesRes.data || []) as { total: number; channel?: string; payment_method?: string }[];
    const prev = (prevRes.data || []) as { total: number }[];
    const currentTotal = current.reduce((s, x) => s + Number(x.total), 0);
    const prevTotal = prev.reduce((s, x) => s + Number(x.total), 0);
    const growth = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal * 100) : 0;
    const byChannel: Record<string, number> = {};
    const byPayment: Record<string, number> = {};
    for (const s of current) {
      byChannel[s.channel || "outro"] = (byChannel[s.channel || "outro"] || 0) + Number(s.total);
      byPayment[s.payment_method || "outro"] = (byPayment[s.payment_method || "outro"] || 0) + Number(s.total);
    }
    ctx.sales = {
      last30Days: { total: currentTotal, count: current.length, growth, byChannel, byPayment },
      ticketMedio: current.length ? currentTotal / current.length : 0,
    };
  }

  if (capabilities.includes("stock")) {
    const [invRes, alertsRes] = await Promise.all([
      supabase.from("inventory").select("id, status, stock_grams, recipes(name)"),
      supabase.from("alerts").select("id, alert_type, message, resolved").eq("resolved", false),
    ]);
    const inv = (invRes.data || []) as { status: string }[];
    const byStatus = inv.reduce((acc: Record<string, number>, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {});
    ctx.inventory = { byStatus, totalItems: inv.length, alerts: alertsRes.data || [] };
  }

  if (capabilities.includes("employees")) {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const userIds = [...new Set((roles || []).map((r: { user_id: string }) => r.user_id))];
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("user_id, name, phone").in("user_id", userIds)
      : { data: [] };
    const rolesList = (roles || []) as { user_id: string; role: string }[];
    ctx.employees = {
      count: userIds.length,
      list: ((profs as { user_id: string; name: string }[]) || []).map((p) => ({
        name: p.name,
        role: rolesList.find((r) => r.user_id === p.user_id)?.role,
      })),
    };
  }

  if (capabilities.includes("clients") || capabilities.includes("crm_kanban")) {
    const [custRes, leadsRes] = await Promise.all([
      supabase.from("customers").select("id, name, phone, status, total_spent, last_purchase_at").order("last_purchase_at", { ascending: false }).limit(50),
      supabase.from("social_leads").select("id, name, phone, status, source, potential_value, follow_up_date").order("created_at", { ascending: false }).limit(50),
    ]);
    const customers = (custRes.data || []) as Record<string, unknown>[];
    const leads = (leadsRes.data || []) as { status: string }[];
    const leadsByStatus = leads.reduce((acc: Record<string, number>, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});
    ctx.customers = { count: customers.length, recent: customers.slice(0, 15) };
    ctx.leads = { count: leads.length, byStatus: leadsByStatus, recent: leads.slice(0, 15) };
  }

  if (capabilities.includes("demands")) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, status, customer_phone, customer_name, created_at")
      .gte("created_at", start7Str)
      .order("created_at", { ascending: false })
      .limit(30);
    ctx.orders = { last7Days: orders || [], count: (orders || []).length };
  }

  if (capabilities.includes("reports")) {
    const { data: aiReports } = await supabase.from("ai_reports").select("summary, content, period_days, created_at").order("created_at", { ascending: false }).limit(5);
    ctx.ai_reports = aiReports || [];
  }

  if (capabilities.includes("offers")) {
    const { data: promos } = await supabase.from("auto_promotions").select("id, discount_percent, promo_price, status, expires_at").eq("status", "ativa").limit(20);
    ctx.promotions = promos || [];
  }

  return ctx;
}

/**
 * Monta o prompt do assistente do dono.
 * Tenta buscar do knowledge_base (vault) e usa fallback hardcoded se necessário.
 */
export async function buildAssistentePrompt(
  supabase: SupabaseClient,
  dataContext: Record<string, unknown>,
  customInstructions?: string | null
): Promise<string> {
  const ctxStr = JSON.stringify(dataContext, null, 2);
  const truncated = ctxStr.length > 12000 ? ctxStr.slice(0, 11900) + "\n...(dados truncados)" : ctxStr;
  const safeCustom = (customInstructions || "").trim().slice(0, 2000).replace(/\n/g, " ");
  const customBlock = safeCustom
    ? `\n\nINSTRUÇÕES DO PROPRIETÁRIO (siga também aqui):\n${safeCustom}\n`
    : "";

  // Buscar prompt do vault (knowledge_base)
  let basePrompt = "";
  try {
    const { data } = await supabase
      .from("knowledge_base")
      .select("conteudo")
      .eq("caminho", "sistema/assistente-dono")
      .eq("ativa", true)
      .maybeSingle();
    if (data?.conteudo) {
      basePrompt = data.conteudo;
    }
  } catch (e) {
    console.warn("Vault fetch for assistente-dono failed:", (e as Error).message);
  }

  // Fallback hardcoded se vault estiver vazio
  if (!basePrompt) {
    basePrompt = `Você é o assistente pessoal do dono do Café Café Confeitaria — um parceiro de confiança que conhece o negócio e fala como pessoa real. Você atua como assistente de gestão quando o dono pergunta por vendas, pedidos, estoque ou relatórios.

PERSONALIDADE E TOM:
- Fale em português brasileiro, de forma natural e calorosa, como numa conversa de WhatsApp com o dono.
- Com o dono você pode ser mais objetivo e usar listas quando for relatório ou muitos números.
- Use "você" e "a gente"; evite linguagem corporativa ou robótica.

FUNÇÕES PARA O PROPRIETÁRIO:
- Relatórios, estoque, alertas, sugestões e análise de vendas.

REGRAS DE DADOS:
- Use APENAS os dados fornecidos abaixo. Nunca invente números, nomes ou fatos.
- Se não houver dado para o que foi perguntado, diga isso de forma natural.`;
    console.warn("Usando fallback hardcoded para assistente-dono (vault vazio ou indisponível)");
  }

  return `${basePrompt}${customBlock}

DADOS ATUAIS DA PLATAFORMA (use só isso para responder):
${truncated}`;
}

function getPaymentInfoFromSettings(settings: { key: string; value: string }[]): string {
  const map = new Map(settings.map((s) => [s.key, s.value]));
  const pix = (map.get("payment_pix_key") || "").trim();
  const instructions = (map.get("payment_instructions") || "").trim();
  const parts: string[] = [];
  if (pix) parts.push(`Chave PIX para pagamento: ${pix}`);
  if (instructions) parts.push(instructions);
  if (parts.length === 0) return "Formas de pagamento: aceitamos PIX, cartão, dinheiro. Detalhes serão passados pela equipe no momento do pedido.";
  return parts.join(". ");
}

// buildAtendentePrompt removido — era dead code (exportado mas nunca importado).
// Instruções de CRIAR_PEDIDO/ENCOMENDA agora vivem no vault: sistema/registro-pedido-automatico

export type LlmConfig = { apiKey: string; baseUrl: string; model: string };

export async function getLlmConfig(supabase: SupabaseClient): Promise<LlmConfig | null> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  const { data: rows } = await supabase.from("crm_settings").select("key, value").in("key", ["agent_api_key", "agent_api_base", "agent_model"]);
  const map = new Map((rows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const agentKey = (map.get("agent_api_key") || "").trim();
  if (agentKey) {
    const base = (map.get("agent_api_base") || "https://api.openai.com/v1").trim().replace(/\/$/, "");
    const model = (map.get("agent_model") || "gpt-4o").trim() || "gpt-4o";
    return { apiKey: agentKey, baseUrl: base, model };
  }
  if (lovableKey) {
    return {
      apiKey: lovableKey,
      baseUrl: "https://ai.gateway.lovable.dev/v1",
      model: "gpt-4o",
    };
  }
  return null;
}

/**
 * Helper: grava log em agent_debug_logs (tabela de debug). Falha silenciosa
 * — se o insert dá erro, não atrapalha o fluxo normal.
 */
async function dbgLog(
  supabase: SupabaseClient | null | undefined,
  level: "info" | "warn" | "error",
  source: string,
  message: string,
  context?: Record<string, unknown>
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("agent_debug_logs").insert({
      level,
      source,
      message: message.slice(0, 2000),
      context: context || null,
    });
  } catch {
    // silencioso
  }
}

export async function callLlm(
  config: LlmConfig,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  signal?: AbortSignal | null,
  supabase?: SupabaseClient | null
): Promise<string> {
  const safeMessage = sanitizeMessage(userMessage).slice(0, MAX_MESSAGE_LENGTH);
  const recentHistoryRaw = history.slice(-20).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content.slice(0, 2000),
  }));

  // ── Detecta provider pela baseUrl ──
  const isAnthropic = /api\.anthropic\.com/i.test(config.baseUrl);

  // promptSize é referenciado em ambos os paths (Anthropic e OpenAI) dentro
  // de dbgLog. Declarar aqui evita ReferenceError no path Anthropic — antes
  // estava só definido no path OpenAI (mais abaixo).
  let promptSize = 0;

  // Anthropic exige que mensagens ALTERNEM role (user → assistant → user …),
  // que comecem com 'user' e NUNCA repitam duas do mesmo role em sequência.
  // OpenAI é mais tolerante, mas normalizar não atrapalha.
  // Normalização:
  //  1. Descarta primeiras mensagens até achar a 1ª 'user'.
  //  2. Colapsa mensagens consecutivas do mesmo role (junta conteúdo).
  const normalizedHistory: { role: "user" | "assistant"; content: string }[] = [];
  let skippedInitialAssistant = false;
  for (const m of recentHistoryRaw) {
    if (!skippedInitialAssistant) {
      if (m.role !== "user") continue;
      skippedInitialAssistant = true;
    }
    const last = normalizedHistory[normalizedHistory.length - 1];
    if (last && last.role === m.role) {
      // Mesmo role seguido — colapsa em uma só mensagem.
      last.content = `${last.content}\n${m.content}`.slice(0, 4000);
    } else {
      normalizedHistory.push({ role: m.role, content: m.content });
    }
  }
  // Se a última mensagem do histórico normalizado é 'user', precisamos
  // juntá-la à safeMessage pra não mandar duas 'user' seguidas.
  let finalUserContent = safeMessage;
  const lastNorm = normalizedHistory[normalizedHistory.length - 1];
  if (lastNorm && lastNorm.role === "user") {
    finalUserContent = `${lastNorm.content}\n${safeMessage}`.slice(0, 4000);
    normalizedHistory.pop();
  }
  const recentHistory = normalizedHistory;

  if (isAnthropic) {
    // Endpoint, header e body formato Anthropic.
    // Docs: https://docs.anthropic.com/en/api/messages
    const url = `${config.baseUrl.replace(/\/$/, "")}/messages`;
    // promptSize aproximado — system + mensagens (útil só para logs).
    promptSize =
      systemPrompt.length +
      JSON.stringify([
        ...recentHistory,
        { role: "user", content: finalUserContent },
      ]).length;
    // Modelos Anthropic. Opus-4-5-20250929 NÃO está liberado em todas as
    // contas — o fallback automático cobre 404/model_not_found.
    const MODEL_MAP: Record<string, string> = {
      "claude-opus-4-6": "claude-opus-4-1-20250805",
      "claude-opus-4-5": "claude-opus-4-1-20250805",
      "claude-opus-4-1": "claude-opus-4-1-20250805",
      "claude-opus": "claude-opus-4-1-20250805",
      "claude-sonnet-4-5": "claude-sonnet-4-5-20250929",
      "claude-sonnet": "claude-sonnet-4-5-20250929",
      "claude-haiku-4-5": "claude-haiku-4-5-20251001",
      "claude-haiku": "claude-haiku-4-5-20251001",
    };
    const resolvedModel = MODEL_MAP[config.model] || config.model;
    // Ordem de fallback: modelo resolvido → sonnet 4.5 → opus 4.1 → haiku 4.5.
    // Sonnet é o default por ser rápido e ter acesso garantido.
    const candidatesA = Array.from(
      new Set([
        resolvedModel,
        "claude-sonnet-4-5-20250929",
        "claude-opus-4-1-20250805",
        "claude-haiku-4-5-20251001",
      ])
    );
    let lastErrA = "";
    for (const model of candidatesA) {
      for (let attempt = 1; attempt <= LLM_MAX_ATTEMPTS; attempt++) {
        try {
          const res = await fetch(url, {
            method: "POST",
            signal,
            headers: {
              "x-api-key": config.apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model,
              max_tokens: 1500,
              temperature: 0.1,
              system: systemPrompt,
              messages: [
                ...recentHistory,
                { role: "user", content: finalUserContent },
              ],
            }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            lastErrA = `anthropic model=${model} attempt=${attempt} status=${res.status} body=${text.slice(0, 300)}`;
            console.warn("callLlm:", lastErrA);
            await dbgLog(supabase, "error", "callLlm.anthropic", lastErrA, {
              model,
              attempt,
              status: res.status,
              body: text.slice(0, 500),
              promptSize,
              historyLen: recentHistory.length,
            });
            if ((res.status === 429 || res.status >= 500) && attempt < LLM_MAX_ATTEMPTS) {
              await new Promise((r) => setTimeout(r, LLM_RETRY_DELAY_MS * attempt));
              continue;
            }
            break;
          }
          const data = await res.json();
          const content = data?.content?.[0]?.text;
          if (typeof content !== "string" || !content.trim()) {
            lastErrA = `anthropic model=${model} attempt=${attempt} vazio: ${JSON.stringify(data).slice(0, 300)}`;
            console.warn("callLlm:", lastErrA);
            await dbgLog(supabase, "error", "callLlm.anthropic", "resposta vazia", {
              model,
              attempt,
              data: JSON.stringify(data).slice(0, 500),
            });
            break;
          }
          await dbgLog(supabase, "info", "callLlm.anthropic", "sucesso", {
            model,
            attempt,
            contentLen: content.length,
          });
          return content.slice(0, 4096).trim();
        } catch (e) {
          const err = e as Error;
          lastErrA = `anthropic model=${model} attempt=${attempt} exception=${err.name}:${err.message}`;
          console.warn("callLlm:", lastErrA);
          await dbgLog(supabase, "error", "callLlm.anthropic", lastErrA, {
            model,
            attempt,
            errName: err.name,
          });
          if (err.name === "AbortError") break;
          if (attempt < LLM_MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, LLM_RETRY_DELAY_MS * attempt));
            continue;
          }
          break;
        }
      }
    }
    throw new Error(`Anthropic error: ${lastErrA || "sem resposta"}`);
  }

  // ── Formato OpenAI (padrão + gateway Lovable) ──
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    { role: "user", content: finalUserContent },
  ];
  const url = `${config.baseUrl}/chat/completions`;
  const candidates = new Set<string>([config.model]);
  if (config.baseUrl.includes("lovable.dev")) {
    candidates.add("openai/gpt-4o");
    candidates.add("gpt-4o");
    candidates.add("google/gemini-3-flash-preview");
  }

  let lastErr = "";
  promptSize = JSON.stringify(messages).length;

  // Tenta cada modelo, com retry para erros transientes (5xx, 429, timeout).
  for (const model of candidates) {
    for (let attempt = 1; attempt <= LLM_MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          signal,
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.05,
            max_tokens: 1500,
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          lastErr = `model=${model} attempt=${attempt} status=${res.status} body=${text.slice(0, 300)} promptSize=${promptSize}`;
          console.warn("callLlm:", lastErr);
          // 5xx / 429 → tenta de novo. 4xx diferente → sem retry, vai pro próximo modelo.
          const transient = res.status === 429 || res.status >= 500;
          if (transient && attempt < LLM_MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, LLM_RETRY_DELAY_MS * attempt));
            continue;
          }
          break; // próximo modelo
        }
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== "string" || !content.trim()) {
          lastErr = `model=${model} attempt=${attempt} resposta vazia data=${JSON.stringify(data).slice(0, 300)}`;
          console.warn("callLlm:", lastErr);
          break; // próximo modelo — vazio raramente melhora com retry
        }
        return content.slice(0, 4096).trim();
      } catch (e) {
        const err = e as Error;
        lastErr = `model=${model} attempt=${attempt} exception=${err.name}:${err.message}`;
        console.warn("callLlm:", lastErr);
        if (err.name === "AbortError") {
          // Timeout — não tenta de novo com mesmo controller; vai pro próximo modelo.
          break;
        }
        if (attempt < LLM_MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, LLM_RETRY_DELAY_MS * attempt));
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`LLM error: ${lastErr || "sem resposta válida dos modelos"}`);
}

export async function runAssistente(
  supabase: SupabaseClient,
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const safeHistory = sanitizeHistory(history);
  const safeMessage = sanitizeMessage(message);
  if (!safeMessage) return FALLBACK_ASSISTENTE;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const [dataContext, settingsRes] = await Promise.all([
      buildDataContext(supabase, CAPABILITIES),
      supabase.from("crm_settings").select("key, value").in("key", ["atendente_instructions"]),
    ]);
    const instructionsRow = (settingsRes.data || []).find((s: { key: string; value: string }) => s.key === "atendente_instructions");
    const customInstructions = instructionsRow?.value ?? null;
    const systemPrompt = await buildAssistentePrompt(supabase, dataContext, customInstructions);
    const config = await getLlmConfig(supabase);
    if (config) {
      const reply = await callLlm(config, systemPrompt, safeMessage, safeHistory, controller.signal, supabase);
      return reply || FALLBACK_ASSISTENTE;
    }
    return `Dados disponíveis: ${JSON.stringify(dataContext).slice(0, 1200)}. Configure a API de IA em CRM > Configurações para respostas completas.`;
  } catch (e) {
    if ((e as Error).name === "AbortError") return FALLBACK_ASSISTENTE;
    console.error("runAssistente error:", (e as Error).message);
    return FALLBACK_ASSISTENTE;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Mapeia o intent legado (PromptIntent) para o novo sistema (Intent do routeNotes).
 * Permite compatibilidade com o webhook existente enquanto migra para o novo.
 */
function mapLegacyIntent(legacyIntent?: PromptIntent): Intent {
  if (!legacyIntent) return "unknown";
  const map: Record<string, Intent> = {
    greeting: "greeting",
    start_order: "order_now",
    ask_price: "pricing",
    ask_recommendation: "pricing",
    delivery_urgency: "delivery",
    payment_proof: "payment",
    other: "unknown",
  };
  return map[legacyIntent] || "unknown";
}

export async function runAtendente(
  supabase: SupabaseClient,
  message: string,
  contactName: string,
  history: { role: "user" | "assistant"; content: string }[],
  /** Novos parâmetros opcionais para o sistema modular */
  modularOpts?: {
    intent: PromptIntent;
    stage: PromptStage;
    hasOrderInProgress: boolean;
  },
  /** Nova arquitetura: intent do routeNotes (mais granular) */
  smartIntent?: Intent
): Promise<string> {
  const safeMessage = sanitizeMessage(message);
  if (!safeMessage) return FALLBACK_ATENDENTE;
  const safeHistory = sanitizeHistory(history);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const [promosRes, settingsRes, acaiRes, allRecipesRes, deliveryZonesRes] = await Promise.all([
      supabase.from("auto_promotions").select("discount_percent, promo_price, status").eq("status", "ativa").limit(5),
      supabase.from("crm_settings").select("key, value").in("key", ["payment_pix_key", "payment_instructions", "atendente_instructions"]),
      supabase.from("recipes").select("id, name, sale_price, slice_price, complementos").eq("active", true).eq("category", "acai"),
      supabase.from("recipes").select("id, name, sale_price, slice_price, whole_price").eq("active", true).order("name"),
      // .then no query builder resolve a Promise e aí conseguimos encadear catch.
      // .catch direto em .order() não existe — por isso o runAtendente quebrava
      // com "supabase.from(...).order(...).catch is not a function".
      Promise.resolve(
        supabase
          .from("delivery_zones_disponibilidade")
          .select("bairro, cidade, taxa, taxa_max, distancia_km, max_pedidos_dia, pedidos_hoje, vagas_restantes, disponivel")
          .order("bairro")
      ).catch(() => ({ data: [] })),
    ]);
    const promos = (promosRes.data || []) as { discount_percent?: number; promo_price?: number }[];
    const promoSummary = promos.length
      ? promos.map((p) => `${p.discount_percent ?? 0}% off ou R$ ${p.promo_price ?? "?"}`).join("; ")
      : "nenhuma oferta ativa no momento";
    const settings = (settingsRes.data || []) as { key: string; value: string }[];
    const paymentInfo = getPaymentInfoFromSettings(settings);
    const customInstructions = settings.find((s) => s.key === "atendente_instructions")?.value ?? null;
    const acaiRecipes = (acaiRes.data || []) as { name: string; sale_price?: number; slice_price?: number; complementos?: string[] | null }[];
    const defaultComplements = ["Morango", "Banana", "Leite condensado", "Leite ninho", "Granola"];
    let cardapioAcai = "";
    if (acaiRecipes.length > 0) {
      const lines = acaiRecipes.map((r) => {
        const price = Number(r.slice_price ?? r.sale_price ?? 0);
        const comps = Array.isArray(r.complementos) && r.complementos.length > 0 ? r.complementos : defaultComplements;
        return `${r.name}: R$ ${price.toFixed(2)}. Complementos disponíveis: ${comps.join(", ")}.`;
      });
      cardapioAcai = lines.join("\n");
    }
    const allRecipes = (allRecipesRes.data || []) as { id: string; name: string; sale_price?: number | null; slice_price?: number | null; whole_price?: number | null }[];
    const cardapioProdutos = allRecipes.map((r) => r.name).join("\n");
    const cardapioDetalhadoLinhas = allRecipes.map((r) => {
      const inteiro = r.whole_price != null ? `inteiro: R$ ${Number(r.whole_price).toFixed(2)}` : "";
      const fatia = r.slice_price != null ? `fatia: R$ ${Number(r.slice_price).toFixed(2)}` : "";
      const unidade = r.sale_price != null ? `unidade: R$ ${Number(r.sale_price).toFixed(2)}` : "";
      const partes = [inteiro, fatia, unidade].filter(Boolean).join(" | ");
      return partes ? `- ${r.name} – ${partes}` : `- ${r.name}`;
    });
    let cardapioProdutosDetalhado = cardapioDetalhadoLinhas.join("\n");
    // Se o cardápio detalhado for muito grande, não descarte produtos:
    // mantenha TODAS as linhas detalhadas que couberem em ~3500 chars e
    // anexe os nomes dos restantes (sem preço) — assim nenhum produto
    // some do conhecimento do agente.
    if (cardapioProdutosDetalhado.length > 4000) {
      const MAX_DETAIL = 3500;
      const kept: string[] = [];
      const overflow: string[] = [];
      let usado = 0;
      for (let i = 0; i < cardapioDetalhadoLinhas.length; i++) {
        const linha = cardapioDetalhadoLinhas[i];
        if (usado + linha.length + 1 <= MAX_DETAIL) {
          kept.push(linha);
          usado += linha.length + 1;
        } else {
          overflow.push(allRecipes[i].name);
        }
      }
      cardapioProdutosDetalhado = overflow.length > 0
        ? `${kept.join("\n")}\n(Também disponíveis — consultar preço com a equipe: ${overflow.join(", ")})`
        : kept.join("\n");
    }

    // ── Montar tabela de zonas de delivery com disponibilidade ──
    interface DeliveryZoneDisp {
      bairro: string; cidade: string; taxa: number; taxa_max?: number | null;
      distancia_km?: number | null; max_pedidos_dia?: number;
      pedidos_hoje?: number; vagas_restantes?: number; disponivel?: boolean;
    }
    const deliveryZones = ((deliveryZonesRes as any)?.data || []) as DeliveryZoneDisp[];
    let deliveryZonesText = "";
    if (deliveryZones.length > 0) {
      const lines = deliveryZones.map((z) => {
        const taxaMin = Number(z.taxa).toFixed(2);
        const taxaStr = z.taxa_max ? `R$ ${taxaMin} a R$ ${Number(z.taxa_max).toFixed(2)}` : `R$ ${taxaMin}`;
        const dist = z.distancia_km != null ? `${z.distancia_km}km` : "";
        const limite = z.max_pedidos_dia ?? 20;
        const vagas = z.vagas_restantes ?? limite;
        const status = vagas <= 0 ? " ⛔ ESGOTADO HOJE" : vagas <= 3 ? ` ⚠️ ${vagas} vagas` : "";
        return `- ${z.bairro} (${z.cidade}): ${taxaStr} | ${dist} | máx ${limite}/dia${status}`;
      });
      deliveryZonesText = lines.join("\n");
    }

    // ════════════════════════════════════════════════════════════════
    // NOVA ARQUITETURA v2: routeNotes + decisionLayer + calculator
    //
    //   Mensagem → detectEntities → routeNotes → fetchNotas → preCalcular → LLM
    //
    //   Obsidian = memória e regras
    //   Calculator = cálculos exatos (FORA da LLM)
    //   LLM = raciocínio + conversa + condução
    // ════════════════════════════════════════════════════════════════
    let systemPrompt: string;

    // Determinar o intent granular (novo routeNotes)
    const effectiveIntent: Intent = smartIntent || mapLegacyIntent(modularOpts?.intent);

    try {
      // 1. Detectar entidades na mensagem
      const entities = detectEntities(safeMessage);

      // 2. Camada de decisão: rotear → buscar notas → pré-calcular
      const decisionCtx = await buildDecisionContext(
        supabase,
        safeMessage,
        effectiveIntent,
        entities,
        contactName,
        paymentInfo,
        (customInstructions || "").trim().slice(0, 6000),
        promoSummary,
        (cardapioAcai || "").trim(),
        (cardapioProdutosDetalhado || "").trim(),
        (cardapioProdutos || "").replace(/\n/g, ", "),
        deliveryZonesText,
        allRecipes as RecipeInfo[]
      );

      // 3. SEMPRE usar buildSmartPrompt (vault-based)
      // Mesmo se vault estiver vazio, o smartPrompt é enxuto e correto
      systemPrompt = buildSmartPrompt(decisionCtx);

      // Se vault estava vazio, logar para debug (mas NÃO usar fallback pesado)
      if (!decisionCtx.notasRelevantes) {
        console.warn("knowledge_base retornou vazio — usando smartPrompt mínimo (sem fallback hardcoded)");
      }
    } catch (e) {
      console.error("decisionLayer falhou:", (e as Error).message);
      // Fallback MÍNIMO — nunca mais usar buildModularAtendentePrompt pesado
      systemPrompt = buildModularAtendentePrompt({
        intent: modularOpts?.intent || "other",
        stage: modularOpts?.stage || "start",
        hasOrderInProgress: modularOpts?.hasOrderInProgress || false,
        contactName, promoSummary, paymentInfo, customInstructions,
        cardapioAcai: cardapioAcai || null,
        cardapioProdutos: cardapioProdutos || null,
        cardapioProdutosDetalhado: cardapioProdutosDetalhado || null,
        deliveryZonesText: deliveryZonesText || null,
      });
    }

    const config = await getLlmConfig(supabase);
    if (!config) {
      console.error(
        "runAtendente: SEM CONFIG DE LLM (nem agent_api_key em crm_settings, nem LOVABLE_API_KEY env). Cliente vai receber fallback."
      );
      await dbgLog(supabase, "error", "runAtendente", "sem config de LLM — fallback", {});
      return FALLBACK_ATENDENTE;
    }
    await dbgLog(supabase, "info", "runAtendente", "chamando callLlm", {
      baseUrl: config.baseUrl,
      model: config.model,
      msgLen: safeMessage.length,
      historyLen: safeHistory.length,
      promptLen: systemPrompt.length,
    });
    try {
      const reply = await callLlm(config, systemPrompt, safeMessage, safeHistory, controller.signal, supabase);
      if (!reply) {
        await dbgLog(supabase, "error", "runAtendente", "callLlm retornou vazio — fallback", {});
      }
      return reply || FALLBACK_ATENDENTE;
    } catch (llmErr) {
      const m = (llmErr as Error).message;
      console.error(
        "runAtendente: callLlm FALHOU após retries:",
        m,
        "| modelo=",
        config.model,
        "baseUrl=",
        config.baseUrl
      );
      await dbgLog(supabase, "error", "runAtendente", "callLlm threw após retries", {
        message: m,
        model: config.model,
        baseUrl: config.baseUrl,
      });
      return FALLBACK_ATENDENTE;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      console.error("runAtendente: AbortError (timeout geral)");
      await dbgLog(supabase, "error", "runAtendente", "AbortError (timeout geral)", {});
      return FALLBACK_ATENDENTE;
    }
    const m = (e as Error).message;
    console.error("runAtendente error:", m);
    await dbgLog(supabase, "error", "runAtendente", "exception geral", { message: m });
    return FALLBACK_ATENDENTE;
  } finally {
    clearTimeout(timeoutId);
  }
}
