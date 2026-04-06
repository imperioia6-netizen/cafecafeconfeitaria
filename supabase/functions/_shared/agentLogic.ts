import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeMessage, sanitizeHistory, MAX_MESSAGE_LENGTH } from "./security.ts";
import { buildAtendenteBasePrompt } from "./atendentePromptBase.ts";
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
const LLM_TIMEOUT_MS = 28000;

/** Resposta padrão quando a IA falha (assistente). */
const FALLBACK_ASSISTENTE = "No momento não consegui processar. Pode repetir em poucos segundos ou ver os dados direto no painel.";

/** Resposta padrão quando a IA falha (atendente). */
const FALLBACK_ATENDENTE = "Obrigado pela mensagem! Nossa equipe já foi avisada e em breve retorna. Qualquer dúvida, estamos à disposição.";

/** Link fixo do cardápio completo em PDF (Drive). */
const CARDAPIO_PDF_URL = "http://bit.ly/3OYW9Fw";

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

export function buildAssistentePrompt(
  dataContext: Record<string, unknown>,
  customInstructions?: string | null
): string {
  const ctxStr = JSON.stringify(dataContext, null, 2);
  const truncated = ctxStr.length > 12000 ? ctxStr.slice(0, 11900) + "\n...(dados truncados)" : ctxStr;
  const safeCustom = (customInstructions || "").trim().slice(0, 2000).replace(/\n/g, " ");
  const customBlock = safeCustom
    ? `\n\nINSTRUÇÕES DO PROPRIETÁRIO (siga também aqui):\n${safeCustom}\n`
    : "";
  return `Você é o assistente pessoal do dono do Café Café Confeitaria — um parceiro de confiança que conhece o negócio e fala como pessoa real. Você atua como assistente de gestão quando o dono pergunta por vendas, pedidos, estoque ou relatórios.${customBlock}

PERSONALIDADE E TOM:
- Fale em português brasileiro, de forma natural e calorosa, como numa conversa de WhatsApp com o dono.
- Com o dono você pode ser mais objetivo e usar listas quando for relatório ou muitos números.
- Use "você" e "a gente"; evite linguagem corporativa ou robótica.
- Quando fizer sentido, faça uma pergunta de follow-up ou um comentário breve.
- Se os dados forem positivos, reconheça de forma genuína; se houver algo para atenção, seja direto mas empático.

FUNÇÕES PARA O PROPRIETÁRIO:
- Relatórios: se o dono pedir relatório e não indicar período, use últimos 7 dias. Informe: total vendido, número de pedidos, ticket médio, produtos mais vendidos.
- Estoque: quando pedir estoque, mostrar produtos com estoque baixo e estoque crítico.
- Alertas: você pode avisar o dono quando houver estoque baixo, produto acabando, aumento de vendas ou produto com baixa saída (ex.: "O bolo de prestígio está quase acabando no estoque.").
- Sugestões: pode sugerir produzir mais de um produto, fazer promoção ou retirar produto com pouca saída — sempre como sugestão.
- Análise de vendas: organize de forma clara (total vendido, pedidos, ticket médio; produtos mais vendidos; produtos com pouca saída). Pode apontar tendências (ex.: "O bolo de brigadeiro está vendendo muito mais que os outros sabores.").

REGRAS DE DADOS:
- Use APENAS os dados fornecidos abaixo. Nunca invente números, nomes ou fatos.
- Se não houver dado para o que foi perguntado, diga isso de forma natural.

PDF E DOCUMENTOS:
- A mensagem do dono pode incluir "[Conteúdo do PDF anexado]" com texto extraído de um PDF.
- Analise esse conteúdo quando o dono pedir para registrar algo, conferir comprovante ou usar informações do documento.
- Resuma, extraia dados relevantes (valores, datas, nomes) e responda com base no que está no PDF quando fizer sentido.

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

export function buildAtendentePrompt(
  contactName: string,
  promoSummary: string,
  paymentInfo: string,
  customInstructions?: string | null,
  cardapioAcai?: string | null,
  cardapioProdutos?: string | null,
  cardapioProdutosDetalhado?: string | null
): string {
  const safeName = contactName.slice(0, 100).replace(/\n/g, " ");
  const safePromo = promoSummary.slice(0, 500).replace(/\n/g, " ");
  const safePayment = paymentInfo.slice(0, 800).replace(/\n/g, " ");
  // Mantém quase todo o texto das instruções do proprietário (até 6000 caracteres) e preserva quebras de linha
  const safeCustom = (customInstructions || "").trim().slice(0, 6000);
  const customBlock = safeCustom
    ? `\n\nINSTRUÇÕES DO PROPRIETÁRIO (PRIORIDADE MÁXIMA):\n${safeCustom}\n`
    : "";
  const acaiBlock = (cardapioAcai || "").trim()
    ? `

AÇAÍ (MONTAR) E COMPLEMENTOS:
${cardapioAcai}
- Pergunte quais complementos o cliente deseja e anote na observação do pedido.
- Para entrega, confirme os complementos antes de fechar.`
    : "";

  const cardapioDetalhado = (cardapioProdutosDetalhado || "").trim();
  const cardapioBlock = cardapioDetalhado
    ? `

CARDÁPIO E PREÇOS (FONTE DE VERDADE PARA VALORES):
${cardapioDetalhado}

REGRA DE BOLOS POR KG:
- valor_total = preço_por_kg × quantidade_em_kg. NUNCA informe o preço de 1kg para 2kg ou mais.
- Encomenda acima de R$300: entrada de 50%. Até R$300: pagamento integral.
`
    : "";

  const createBlock = (cardapioProdutos || "").trim()
    ? `

REGISTRO AUTOMÁTICO NA PLATAFORMA:
- Quando o cliente finalizar o pedido E enviar comprovante, inclua no FINAL da resposta o bloco correspondente (o cliente não vê).

1) PEDIDO NORMAL: [CRIAR_PEDIDO] com JSON. Nomes exatos: ${(cardapioProdutos ?? "").replace(/\n/g, ", ")}.
Exemplo: [CRIAR_PEDIDO]{"customer_name":"Nome","customer_phone":"5511999999999","channel":"delivery","order_number":"","table_number":"","payment_method":"pix","items":[{"recipe_name":"Abacaxi com Creme","quantity":1,"unit_type":"whole","notes":""}]}[/CRIAR_PEDIDO]
- Se o cliente pedir decoração, escreva no campo "notes" do item a descrição EXATA que o cliente falou.

2) ENCOMENDA acima de R$300 (50% entrada): [CRIAR_ENCOMENDA] com paid_50_percent=true.
Exemplo: [CRIAR_ENCOMENDA]{"customer_name":"Nome","customer_phone":"5511999999999","product_description":"Bolo 1kg","quantity":1,"total_value":320,"address":"Rua X 123","payment_method":"pix","paid_50_percent":true,"observations":"","delivery_date":"2025-03-15","delivery_time_slot":"14h às 18h"}[/CRIAR_ENCOMENDA]
- Se houver decoração, coloque a descrição EXATA do cliente no campo "observations".

3) QUITAR ENCOMENDA (restante dos 50%): [QUITAR_ENCOMENDA] com customer_phone, payment_value, payment_date.
Exemplo: [QUITAR_ENCOMENDA]{"customer_phone":"5511999999999","payment_value":60,"payment_date":"2025-03-20"}[/QUITAR_ENCOMENDA]

4) CADASTRO DO CLIENTE: [ATUALIZAR_CLIENTE] quando tiver nome, telefone, email, endereço e aniversário.
Formato: [ATUALIZAR_CLIENTE]{"name":"Nome","phone":"5511999999999","email":"email@exemplo.com","address":"Rua, número, bairro, cidade","birthday":"1990-05-15"}[/ATUALIZAR_CLIENTE]

5) DÚVIDA / ACIONAR EQUIPE: [ALERTA_EQUIPE]Texto curto explicando a dúvida.[/ALERTA_EQUIPE]`
    : "";

  const basePrompt = buildAtendenteBasePrompt();
  return `REGRA #1 — SÓ PRODUTOS DO CARDÁPIO:
Você SÓ pode citar, recomendar ou mencionar produtos que estejam na lista "CARDÁPIO E PREÇOS" deste prompt. Se não está na lista, NÃO EXISTE. Nunca invente sabores.

REGRA #2 — CONVERSA CONTÍNUA:
Leia o histórico inteiro antes de responder. Mantenha coerência. Não repita perguntas já respondidas.

${basePrompt}
${customBlock}
${acaiBlock}
${cardapioBlock}
${createBlock}

INFORMAÇÕES DO CONTATO:
- Nome: ${safeName || "não informado"}
- Promoções: ${safePromo || "nenhuma"}
- Pagamento: ${safePayment}

CARDÁPIO COMPLETO EM PDF: ${CARDAPIO_PDF_URL}
- Envie o link quando pedirem o cardápio completo. Se perguntarem preço específico, informe o valor direto.
`;
}

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

/** Retorna config de fallback (Lovable gateway) quando a primária falha. */
export function getLlmFallbackConfig(): LlmConfig | null {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  if (!lovableKey) return null;
  return {
    apiKey: lovableKey,
    baseUrl: "https://ai.gateway.lovable.dev/v1",
    model: "gpt-4o",
  };
}

export async function callLlm(
  config: LlmConfig,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  signal?: AbortSignal | null
): Promise<string> {
  const safeMessage = sanitizeMessage(userMessage).slice(0, MAX_MESSAGE_LENGTH);
  // Enviar histórico completo ao LLM (até 20 mensagens, que é o que vem do banco)
  // Mensagens muito grandes são truncadas para economizar tokens
  const recentHistory = history.slice(-20).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content.slice(0, 2000),
  }));
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    { role: "user", content: safeMessage },
  ];
  const url = `${config.baseUrl}/chat/completions`;
  const candidates = new Set<string>([config.model]);
  if (config.baseUrl.includes("lovable.dev")) {
    // Gateway pode exigir provider/model. Mantemos fallback para evitar indisponibilidade total.
    candidates.add("openai/gpt-4o");
    candidates.add("gpt-4o");
    candidates.add("google/gemini-3-flash-preview");
  }

  let lastErr = "";
  for (const model of candidates) {
    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature: 0, max_tokens: 600 }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      lastErr = `model=${model} status=${res.status} ${text.slice(0, 200)}`;
      console.error("callLlm FAIL:", lastErr);
      continue;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      lastErr = `model=${model} resposta vazia`;
      continue;
    }
    return content.slice(0, 4096).trim();
  }

  console.error("callLlm ALL MODELS FAILED. Last error:", lastErr, "| URL:", config.baseUrl, "| model:", config.model);
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
    const systemPrompt = buildAssistentePrompt(dataContext, customInstructions);
    const config = await getLlmConfig(supabase);
    if (config) {
      try {
        const reply = await callLlm(config, systemPrompt, safeMessage, safeHistory, controller.signal);
        return reply || FALLBACK_ASSISTENTE;
      } catch (primaryErr) {
        console.error("runAssistente primary LLM failed:", (primaryErr as Error).message);
        // Tentar fallback com Lovable gateway se a config primária não for Lovable
        if (!config.baseUrl.includes("lovable.dev")) {
          const fallback = getLlmFallbackConfig();
          if (fallback) {
            console.log("runAssistente: tentando fallback Lovable gateway...");
            const reply = await callLlm(fallback, systemPrompt, safeMessage, safeHistory, controller.signal);
            return reply || FALLBACK_ASSISTENTE;
          }
        }
        throw primaryErr;
      }
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
      supabase.from("delivery_zones_disponibilidade").select("bairro, cidade, taxa, taxa_max, distancia_km, max_pedidos_dia, pedidos_hoje, vagas_restantes, disponivel").order("bairro"),
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
    let cardapioProdutosDetalhado = allRecipes
      .map((r) => {
        const nome = r.name;
        const inteiro = r.whole_price != null ? `inteiro: R$ ${Number(r.whole_price).toFixed(2)}` : "";
        const fatia = r.slice_price != null ? `fatia: R$ ${Number(r.slice_price).toFixed(2)}` : "";
        const unidade = r.sale_price != null ? `unidade: R$ ${Number(r.sale_price).toFixed(2)}` : "";
        const partes = [inteiro, fatia, unidade].filter(Boolean).join(" | ");
        return partes ? `- ${nome} – ${partes}` : `- ${nome}`;
      })
      .join("\n");
    // Truncar cardápio se ultrapassar 4000 caracteres para economizar tokens
    if (cardapioProdutosDetalhado.length > 4000) {
      cardapioProdutosDetalhado = cardapioProdutosDetalhado.slice(0, 3950) + "\n...(cardápio truncado)";
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
    // ARQUITETURA v3: Vault = memória completa + dados tempo real
    //   Vault (knowledge_base) = regras, fluxos, cardápio estático
    //   Banco (recipes, zones) = preços e disponibilidade em tempo real
    //   Calculator = cálculos exatos (FORA da LLM)
    //   LLM = conversa + condução + apresentação
    // ════════════════════════════════════════════════════════════════
    const effectiveIntent: Intent = smartIntent || mapLegacyIntent(modularOpts?.intent);
    const entities = detectEntities(safeMessage);

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

    const systemPrompt = buildSmartPrompt(decisionCtx);

    const config = await getLlmConfig(supabase);
    if (config) {
      try {
        const reply = await callLlm(config, systemPrompt, safeMessage, safeHistory, controller.signal);
        return reply || FALLBACK_ATENDENTE;
      } catch (primaryErr) {
        console.error("runAtendente primary LLM failed:", (primaryErr as Error).message);
        // Tentar fallback com Lovable gateway se a config primária não for Lovable
        if (!config.baseUrl.includes("lovable.dev")) {
          const fallback = getLlmFallbackConfig();
          if (fallback) {
            console.log("runAtendente: tentando fallback Lovable gateway...");
            const reply = await callLlm(fallback, systemPrompt, safeMessage, safeHistory, controller.signal);
            return reply || FALLBACK_ATENDENTE;
          }
        }
        throw primaryErr;
      }
    }
    return "Olá! Obrigado pelo contato. Em breve nossa equipe retorna. Qual seu nome?";
  } catch (e) {
    if ((e as Error).name === "AbortError") return FALLBACK_ATENDENTE;
    console.error("runAtendente error:", (e as Error).message);
    return FALLBACK_ATENDENTE;
  } finally {
    clearTimeout(timeoutId);
  }
}
