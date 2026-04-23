/**
 * evolution-webhook/index.ts — Entry point enxuto do webhook Evolution API.
 *
 * Toda a lógica de negócio foi extraída para módulos em _shared/:
 * - webhookUtils.ts      → parsing de payload, config, normalização
 * - conversationMemory.ts → memória de pedido, continuidade de conversa
 * - intentDetection.ts   → detecção de intent e estágio do fluxo
 * - priceEngine.ts       → cálculo de preço, guardrails, decoração
 * - evolutionApi.ts      → envio de mensagens via Evolution
 * - customerManager.ts   → gestão de customers e leads
 * - orderProcessor.ts    → pedidos, encomendas, pagamentos
 * - debounce.ts          → agrupamento de mensagens rápidas
 * - security.ts          → sanitização, SSRF, timing-safe auth
 * - agentLogic.ts        → chamadas ao LLM (runAssistente, runAtendente)
 *
 * Este arquivo contém APENAS:
 * 1. O handler serve() com roteamento do webhook
 * 2. Orquestração dos módulos
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Módulos de segurança ──
import {
  sanitizeMessage,
  sanitizePhone,
  sanitizeName,
  isAllowedEvolutionBaseUrl,
  verifyWebhookSecret,
} from "../_shared/security.ts";

// ── Módulos de webhook ──
import {
  EVOLUTION_KEYS,
  getEvolutionConfig,
  extractMessageText,
  extractRemoteJid,
  extractMessageId,
  normalizeForCompare,
  buildFullMessage,
  hasPdfDocument,
} from "../_shared/webhookUtils.ts";

// ── Módulos de conversa ──
import {
  extractOrderMemory,
  buildOrderMemoryHint,
  enforceCakeContinuity,
  enforceOrderSummaryCompleteness,
  buildPreviousQuestionHint,
} from "../_shared/conversationMemory.ts";

// ── Módulos de intent ──
import {
  detectIntent,
  deriveStage,
  buildControlHint,
  enforceOrderTypeQuestion,
  wantsNewOrder,
} from "../_shared/intentDetection.ts";
import type { ConversationIntent } from "../_shared/intentDetection.ts";

// ── Módulos de preço ──
import {
  detectCakePriceIntent,
  enforceReplyGuardrails,
  enforceAskBeforePayment,
  enforcePhantomWritingRemoval,
  enforceEncomendaDeliveryQuestion,
  enforceNoRepeatAfterPix,
  enforceNoFragmentAsFlavor,
  enforceSanePrices,
  enforceNoExactRepeat,
  enforceGreetingReset,
  enforceAskMoreBeforeClosure,
  enforceOrderSummarySanity,
  enforceIntentAlignment,
  enforceSignalWhenLargeOrder,
  enforceSmartFallback,
  enforceNoTemplatePlaceholders,
  enforceWelcomeTemplate,
  messageIsAboutWriting,
  extractDecorationRequestFromMessage,
  applyDecorationToPedidoPayload,
  applyDecorationToEncomendaPayload,
} from "../_shared/priceEngine.ts";

// ── Módulos de API ──
import { sendEvolutionMessage } from "../_shared/evolutionApi.ts";
import { buildTeamSummary } from "../_shared/teamSummary.ts";
import { interpretMessage } from "../_shared/agentInterpreter.ts";

// ── Módulos de cliente/lead ──
import { findOrCreateCustomer, findOrCreateLead } from "../_shared/customerManager.ts";

// ── Módulos de pedido ──
import {
  parseCreateBlocks,
  checkOpenOrders,
  settleEncomendaFromPayload,
  processClientUpdate,
} from "../_shared/orderProcessor.ts";

// ── Módulos de debounce ──
import { debounceMessage } from "../_shared/debounce.ts";

// ── Módulos de agente IA ──
import { runAssistente, runAtendente } from "../_shared/agentLogic.ts";
import type { PromptIntent, PromptStage } from "../_shared/atendentePromptModules.ts";
import type { Intent as SmartIntent } from "../_shared/routeNotes.ts";

// ── Módulos de owner ──
import {
  getOwner,
  isOwnerPhoneInList,
  parseOwnerPhonesList,
  normalizePhone,
} from "../_shared/getOwner.ts";

// ── Constantes ──

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const FALLBACK_REPLY =
  "Obrigado pela mensagem! Em instantes nossa equipe retorna.";

// ── Helper: resposta JSON padronizada ──

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ══════════════════════════════════════════════════════════════

serve(async (req) => {
  // ── CORS preflight ──
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient<any>(supabaseUrl, serviceKey);

  try {
    const rawBody = await req.json().catch(() => ({}));
    const payload = rawBody as Record<string, unknown>;

    // ── 1. Filtrar eventos não-mensagem ──
    const event = (payload.event as string) || "";
    const data = (payload.data as Record<string, unknown>) || payload;

    const isMessagesEvent =
      !event ||
      event === "MESSAGES_UPSERT" ||
      event === "messages-upsert" ||
      event === "messages.upsert" ||
      event.toLowerCase().includes("message");
    if (event && !isMessagesEvent) {
      return jsonResponse({ ok: true, ignored: event });
    }

    // ── 2. Ignorar mensagens próprias (fromMe) ──
    const key =
      (data.key as { fromMe?: boolean } | undefined) ||
      (payload.key as { fromMe?: boolean } | undefined);
    if (key?.fromMe === true) {
      return jsonResponse({ ok: true, ignored: "fromMe" });
    }

    // ── 3. Deduplicação por message ID ──
    const messageId =
      extractMessageId(data) ||
      extractMessageId(payload as Record<string, unknown>);
    if (messageId) {
      const { data: existing } = await supabase
        .from("webhook_processed_events")
        .select("id")
        .eq("id", messageId)
        .maybeSingle();
      if (existing?.id) {
        return jsonResponse({ ok: true, duplicate: true });
      }
    }

    // ── 4. Carregar config da Evolution + ia_paused ──
    const { data: settingsRows } = await supabase
      .from("crm_settings")
      .select("key, value")
      .in("key", [...EVOLUTION_KEYS, "ia_paused"]);
    const evo = getEvolutionConfig(settingsRows || []);

    // ── 5. Validar instância ──
    const payloadInstance = (
      (data as Record<string, unknown>).instance ||
      (data as Record<string, unknown>).instanceName ||
      (payload as Record<string, unknown>).instance ||
      (payload as Record<string, unknown>).instanceName ||
      ""
    ) as string;
    if (
      evo.instance &&
      evo.instance !== "default" &&
      payloadInstance &&
      payloadInstance !== evo.instance
    ) {
      console.log(
        `[webhook] Ignorando: instância "${payloadInstance}" ≠ configurada "${evo.instance}"`
      );
      return jsonResponse({ ok: true, ignored: "wrong_instance" });
    }

    // ── 6. Verificar webhook secret (timing-safe) ──
    const headerSecret =
      req.headers.get("x-webhook-secret") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      null;
    const querySecret = new URL(req.url || "", "http://x").searchParams.get("secret");
    if (!verifyWebhookSecret(evo.webhookSecret, headerSecret, querySecret)) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    // ── 7. Extrair remetente ──
    const keyForJid = data.key ?? payload.key;
    const dataForExtract = keyForJid ? { ...data, key: keyForJid } : data;
    const remoteJid = extractRemoteJid(dataForExtract);
    const normalizedPhone = sanitizePhone(remoteJid);
    if (!normalizedPhone) {
      return jsonResponse({ ok: true, invalidPhone: true });
    }

    // ── 8. Extrair mensagem completa (texto + PDF) ──
    const fullPayload = (data.message ? data : payload) as Record<string, unknown>;
    const fullMessage = await buildFullMessage(fullPayload, {
      baseUrl: evo.baseUrl,
      apiKey: evo.apiKey,
      instance: evo.instance,
    });
    if (!fullMessage || !fullMessage.trim()) {
      return jsonResponse({ ok: true, noText: true });
    }

    // ── 9. Validar Evolution config ──
    if (!evo.baseUrl || !evo.apiKey) {
      return jsonResponse({ ok: false, error: "Evolution not configured" });
    }
    if (!isAllowedEvolutionBaseUrl(evo.baseUrl)) {
      return jsonResponse({ ok: false, error: "Invalid Evolution URL" });
    }

    // ── 10. Marcar mensagem como processada (idempotência) ──
    if (messageId) {
      try {
        await supabase.from("webhook_processed_events").insert({ id: messageId });
      } catch (e) {
        // Duplicata (chave primária) é esperada e não bloqueia o fluxo;
        // logamos em debug para permitir auditoria se necessário.
        console.debug(
          "webhook_processed_events insert ignorado:",
          (e as Error)?.message || "duplicate"
        );
      }
    }

    // ── 11. Identificar dono ──
    const owner = await getOwner(supabase);
    const { data: ownerSettingsRows } = await supabase
      .from("crm_settings")
      .select("key, value")
      .in("key", ["owner_phones", "owner_phone_override"]);
    const ownerPhonesMap = new Map(
      (ownerSettingsRows || []).map((r: { key: string; value: string }) => [
        r.key,
        r.value,
      ])
    );
    const combined = [
      ownerPhonesMap.get("owner_phones"),
      ownerPhonesMap.get("owner_phone_override"),
    ]
      .filter(Boolean)
      .join("\n");
    let ownerPhonesList = parseOwnerPhonesList(combined);
    if (owner?.ownerPhone) {
      const n = normalizePhone(owner.ownerPhone);
      if (n.length >= 10 && !ownerPhonesList.includes(n))
        ownerPhonesList = [...ownerPhonesList, n];
    }
    const isOwner =
      ownerPhonesList.length > 0 &&
      isOwnerPhoneInList(normalizedPhone, ownerPhonesList);

    const pushName = sanitizeName((data.pushName as string) || "");

    // Check ia_paused
    const allSettingsMap = new Map(
      (settingsRows || []).map((r: { key: string; value: string }) => [
        r.key,
        r.value,
      ])
    );
    const iaPaused =
      (allSettingsMap.get("ia_paused") || "false").toLowerCase() === "true";

    // ══════════════════════════════════════════════════════════
    // PROCESSAMENTO DA MENSAGEM
    // ══════════════════════════════════════════════════════════

    let reply: string;
    try {
      if (isOwner) {
        // ═══ FLUXO DONO ═══
        reply = await handleOwnerMessage(
          supabase,
          fullMessage,
          remoteJid
        );
      } else {
        // ═══ FLUXO CLIENTE ═══
        const result = await handleCustomerMessage(
          supabase,
          fullMessage,
          normalizedPhone,
          remoteJid,
          pushName,
          evo,
          ownerPhonesList,
          iaPaused
        );

        if (result.earlyReturn) return result.earlyReturn;
        reply = result.reply!;
      }
    } catch (e) {
      console.error("evolution-webhook process error:", (e as Error).message);
      reply = FALLBACK_REPLY;
    }

    // ── Enviar resposta via Evolution ──
    try {
      await sendEvolutionMessage(
        evo.baseUrl,
        evo.apiKey,
        evo.instance,
        normalizedPhone,
        reply
      );
    } catch (e) {
      console.error("evolution-webhook send error:", (e as Error).message);
      return jsonResponse({ ok: false, error: "Send failed" });
    }

    return jsonResponse({ ok: true, isOwner });
  } catch (e) {
    console.error("evolution-webhook error:", (e as Error).message);
    return jsonResponse({ ok: false, error: "Internal error" }, 500);
  }
});

// ══════════════════════════════════════════════════════════════
// HANDLER: MENSAGEM DO DONO
// ══════════════════════════════════════════════════════════════

async function handleOwnerMessage(
  supabase: any,
  fullMessage: string,
  remoteJid: string
): Promise<string> {
  // Buscar histórico do dono
  const { data: ownerHistRows } = await supabase
    .from("messaages log")
    .select("from_me, text")
    .eq("remote_jid", remoteJid)
    .order("id", { ascending: false })
    .limit(12);

  const ownerHistory = (ownerHistRows || [])
    .reverse()
    .map((m: { from_me: boolean | null; text: string | null }) => ({
      role: m.from_me ? ("assistant" as const) : ("user" as const),
      content: (m.text || "").slice(0, 4096),
    }));

  // Salvar entrada
  await supabase.from("messaages log").insert({
    remote_jid: remoteJid,
    from_me: false,
    text: fullMessage.slice(0, 4096),
  });

  const reply = await runAssistente(supabase, fullMessage, ownerHistory);

  // Salvar resposta
  await supabase.from("messaages log").insert({
    remote_jid: remoteJid,
    from_me: true,
    text: reply.slice(0, 4096),
  });

  return reply;
}

// ══════════════════════════════════════════════════════════════
// HANDLER: MENSAGEM DO CLIENTE
// ══════════════════════════════════════════════════════════════

async function handleCustomerMessage(
  supabase: any,
  fullMessage: string,
  normalizedPhone: string,
  remoteJid: string,
  pushName: string,
  evo: { baseUrl: string; apiKey: string; instance: string },
  ownerPhonesList: string[],
  iaPaused: boolean
): Promise<{ reply?: string; earlyReturn?: Response }> {
  const customerId = await findOrCreateCustomer(supabase, normalizedPhone, pushName);
  await findOrCreateLead(supabase, normalizedPhone, pushName, fullMessage);

  // Carregar receitas
  const { data: recipeRows } = await supabase
    .from("recipes")
    .select("name, whole_price, sale_price, slice_price")
    .eq("active", true);
  const recipeRowsTyped = (
    (recipeRows || []) as {
      name?: string;
      whole_price?: number | null;
      sale_price?: number | null;
      slice_price?: number | null;
    }[]
  ).filter((r) => !!r.name);
  const recipeNames = recipeRowsTyped
    .map((r) => (r.name || "").trim())
    .filter((n) => n.length > 0);

  // Salvar mensagem de entrada
  await supabase.from("crm_messages").insert({
    customer_id: customerId,
    message_type: "whatsapp_entrada",
    message_content: fullMessage.slice(0, 4096),
    status: "lida",
    sent_at: new Date().toISOString(),
  });

  // IA pausada? Sair sem responder
  if (iaPaused) {
    return { earlyReturn: jsonResponse({ ok: true, paused: true }) };
  }

  // ── Debounce ──
  const debounceResult = await debounceMessage(supabase, remoteJid, fullMessage);
  if (!debounceResult.shouldProcess) {
    console.log("evolution-webhook: mensagem adicionada ao buffer de debounce para", remoteJid);
    return { earlyReturn: jsonResponse({ ok: true, debounced: true }) };
  }

  const combinedMessage =
    debounceResult.allMessages.length > 1
      ? debounceResult.allMessages.join("\n")
      : fullMessage;

  // Salvar mensagens extras do debounce
  if (debounceResult.allMessages.length > 1) {
    const extraMessages = debounceResult.allMessages.slice(1);
    for (const extraMsg of extraMessages) {
      if (extraMsg !== fullMessage) {
        await supabase.from("crm_messages").insert({
          customer_id: customerId,
          message_type: "whatsapp_entrada",
          message_content: extraMsg.slice(0, 4096),
          status: "lida",
          sent_at: new Date().toISOString(),
        });
      }
    }
    console.log(
      `evolution-webhook: ${debounceResult.allMessages.length} mensagens agrupadas para`,
      remoteJid
    );
  }

  // ── Carregar sessão ──
  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("*")
    .eq("remote_jid", remoteJid)
    .maybeSingle();

  let sessionMemory: Record<string, unknown> = {};
  let sessionExpired = false;
  let instanceChanged = false;

  if (sessionRow) {
    const prevInstance =
      ((sessionRow.memory as Record<string, unknown>)?.evo_instance as string) || "";
    if (prevInstance && prevInstance !== evo.instance) {
      console.log(
        `evolution-webhook: instância mudou (${prevInstance} → ${evo.instance}), resetando sessão para`,
        remoteJid
      );
      await supabase
        .from("sessions")
        .update({
          memory: { evo_instance: evo.instance },
          updated_at: new Date().toISOString(),
        } as any)
        .eq("remote_jid", remoteJid);
      instanceChanged = true;
      sessionExpired = true;
    } else {
      const updatedAt = sessionRow.updated_at
        ? new Date(sessionRow.updated_at).getTime()
        : 0;
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (updatedAt > 0 && Date.now() - updatedAt > TWENTY_FOUR_HOURS) {
        await supabase
          .from("sessions")
          .update({
            memory: { evo_instance: evo.instance },
            updated_at: new Date().toISOString(),
          } as any)
          .eq("remote_jid", remoteJid);
        console.log(
          "evolution-webhook: sessão expirada (>24h), memory limpa para",
          remoteJid
        );
        sessionExpired = true;
      } else {
        sessionMemory = (sessionRow.memory as Record<string, unknown>) || {};
      }
    }
  }

  // ── Carregar histórico ──
  //
  // v242: filtrar por conversation_reset_at — quando o cliente pediu "novo
  // pedido" em algum turno anterior, gravamos o timestamp na session. Mensagens
  // ANTERIORES ao reset são descartadas aqui para o LLM não alucinar com
  // conversas antigas (ex.: "encomenda" virar resposta sobre nutella porque
  // nutella apareceu 3 mensagens atrás).
  let history: { role: string; content: string }[] = [];
  const resetAtRaw = (sessionMemory.conversation_reset_at as string | undefined) || "";
  if (!instanceChanged) {
    let histQuery = supabase
      .from("crm_messages")
      .select("message_type, message_content, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (resetAtRaw) {
      histQuery = histQuery.gt("created_at", resetAtRaw);
    }
    const { data: historyRows } = await histQuery;

    history = (historyRows || [])
      .reverse()
      .map(
        (m: {
          message_type: string;
          message_content: string | null;
          created_at?: string;
        }) => ({
          role: m.message_type === "whatsapp_saida" ? "assistant" : "user",
          content: (m.message_content || "").slice(0, 4096),
        })
      );

    // Remover duplicata da mensagem atual no final
    if (history.length > 0) {
      const last = history[history.length - 1];
      if (
        last.role === "user" &&
        normalizeForCompare(last.content) ===
          normalizeForCompare(combinedMessage)
      ) {
        history = history.slice(0, -1);
      }
    }
    if (resetAtRaw) {
      console.log(
        `evolution-webhook: histórico filtrado por reset_at=${resetAtRaw}, ${history.length} msgs`,
        remoteJid
      );
    }
  } else {
    console.log(
      "evolution-webhook: histórico limpo por mudança de instância para",
      remoteJid
    );
  }

  // ── Detectar intent ──
  let intent = detectIntent(combinedMessage);

  let openOrderHint = "";
  let smartIntentOverride: SmartIntent | undefined;

  // FIX: Mensagens curtas de confirmação → payment_proof se contexto tem PIX
  const shortConfirmPattern =
    /^(pronto|feito|enviado|mandei|enviei|ja fiz|já fiz)\s*[!.]*\s*$/i;
  if (
    shortConfirmPattern.test(normalizeForCompare(combinedMessage)) &&
    intent === "other"
  ) {
    const lastAssistant = [...history]
      .reverse()
      .find((h) => h.role === "assistant");
    const lastAssistantNorm = normalizeForCompare(lastAssistant?.content || "");
    if (
      lastAssistantNorm.includes("pix") ||
      lastAssistantNorm.includes("comprovante") ||
      lastAssistantNorm.includes("pagamento") ||
      lastAssistantNorm.includes("transferi")
    ) {
      intent = "payment_proof";
    }
  }

  // FIX: Respostas curtas em fluxo de pedido → manter intent do contexto
  const prevStage = (sessionMemory.stage as string) || "start";
  const prevIntent = (sessionMemory.last_intent as string) || "";
  if (
    intent === "other" &&
    combinedMessage.trim().length < 60 &&
    prevStage !== "start"
  ) {
    const stageToSmartIntent: Record<string, SmartIntent> = {
      collecting_items: "order_now",
      awaiting_order_type: "order_now",
      confirming_order: "order_now",
      awaiting_payment: "payment",
    };
    const contextIntent = stageToSmartIntent[prevStage];
    if (contextIntent && !smartIntentOverride) {
      smartIntentOverride = contextIntent;
      console.log(
        `evolution-webhook: short answer override → ${contextIntent} (stage=${prevStage})`
      );
    }
  }

  // ── Detectar se cliente quer NOVO pedido (reset total) ──
  // v242: passa history pra detecção contextual — cliente pode responder
  // apenas "novo" / "outro" depois da pergunta "continuar ou novo?".
  const clientWantsNew = wantsNewOrder(
    combinedMessage,
    history as { role: "user" | "assistant"; content: string }[]
  );

  if (clientWantsNew) {
    console.log("evolution-webhook: cliente pediu NOVO pedido → reset de sessão", remoteJid);
    // Limpar memória da sessão para não arrastar pedido anterior
    // v242: persistir conversation_reset_at → histórico futuro é filtrado
    // pra ignorar mensagens anteriores ao reset. Antes, next turn puxava
    // história antiga do banco e o LLM alucinava com contexto velho.
    const resetTimestamp = new Date().toISOString();
    sessionMemory = {
      evo_instance: evo.instance,
      conversation_reset_at: resetTimestamp,
    };
    // Limpar histórico para a LLM não puxar itens antigos (este turno)
    history = [];
    // Forçar intent correto
    intent = "start_order";
    smartIntentOverride = "order_now";
    openOrderHint = `[NOVO_PEDIDO]\nO cliente PEDIU EXPLICITAMENTE um NOVO pedido. NÃO mencione pedidos anteriores. Comece do ZERO. Pergunte: "É para encomenda, delivery ou retirada?"\n[/NOVO_PEDIDO]`;
  }

  // ── Cliente retornando com pedido aberto ──
  const isReturningCustomer =
    sessionExpired && history.length > 0 && !instanceChanged;

  if (
    !clientWantsNew && (
      isReturningCustomer ||
      (intent === "greeting" && history.length > 2 && !instanceChanged)
    )
  ) {
    const { hasOpenOrder, orderSummary } = await checkOpenOrders(
      supabase,
      normalizedPhone
    );
    smartIntentOverride = "returning_customer";

    if (hasOpenOrder) {
      // "Aberto" aqui = pedido/encomenda REALMENTE PENDENTE de finalização
      // (checkOpenOrders já filtra: ignora 50_pago/em_producao/entregue).
      // Só nesse caso perguntamos se quer continuar o pedido anterior.
      openOrderHint = `[DADOS_PEDIDO_PENDENTE]\n${orderSummary}\n\n⚠️ INSTRUÇÃO: O cliente tem um pedido AINDA NÃO FINALIZADO (falta concluir). Cumprimente e PERGUNTE uma vez:\n"Oi, [Nome]! Tudo bem? Vi que seu pedido anterior ficou sem finalizar. Quer continuar de onde parou ou começar um novo?"\nNÃO continue o pedido automaticamente. ESPERE o cliente responder.\n[/DADOS_PEDIDO_PENDENTE]`;
    }

    if (sessionExpired) {
      console.log(
        "evolution-webhook: limpando histórico antigo para cliente retornando",
        remoteJid
      );
      history = [];
    }
  }

  // ── Derivar estágio ──
  const stage = deriveStage(sessionMemory, intent, combinedMessage);

  if (stage === "start" && prevStage !== "start" && !smartIntentOverride) {
    smartIntentOverride = "cancel";
  }

  // ── Construir contexto enriquecido ──
  // Se o cliente pediu novo pedido, NÃO injetar memória de pedido antigo
  const orderMemoryHint = clientWantsNew
    ? ""
    : buildOrderMemoryHint(
        history as { role: "user" | "assistant"; content: string }[],
        sessionMemory
      );
  const previousQuestionHint = buildPreviousQuestionHint(
    history as { role: "user" | "assistant"; content: string }[],
    combinedMessage
  );
  const nowSp = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  const contextParts: string[] = [];
  contextParts.push(`[HORA_ATUAL: ${nowSp}]`);
  if (openOrderHint) contextParts.push(openOrderHint);
  contextParts.push(buildControlHint(intent, stage, sessionMemory, combinedMessage));
  if (orderMemoryHint) contextParts.push(orderMemoryHint);
  if (previousQuestionHint)
    contextParts.push(`[CONTINUIDADE]\n${previousQuestionHint}`);
  contextParts.push(
    `[INSTRUÇÃO]\nResponda SOMENTE com a mensagem para o cliente. Use as informações acima para NÃO re-perguntar nada que já foi dito. Seja curta, direta e humana.`
  );
  contextParts.push(`[MENSAGEM DO CLIENTE]\n${combinedMessage}`);

  const enrichedMessage = contextParts.join("\n\n");

  // ── Cálculo determinístico de preço ──
  const deterministicPriceReply = detectCakePriceIntent(
    combinedMessage,
    recipeRowsTyped as {
      name: string;
      whole_price?: number | null;
      sale_price?: number | null;
      slice_price?: number | null;
    }[]
  );
  let priceHint = "";
  if (deterministicPriceReply) {
    priceHint = `\n\n[CÁLCULO_EXATO_BOLO]\n${deterministicPriceReply}\nUse ESTE VALOR EXATO na resposta. Continue o fluxo normalmente (pergunte tipo de pedido se não informou, etc.).\n[/CÁLCULO_EXATO_BOLO]`;
  }

  // ── Chamar LLM ──
  const orderMem = extractOrderMemory(
    history as { role: "user" | "assistant"; content: string }[]
  );
  const hasOrderInProgress = orderMem.items.length > 0;

  let reply = await runAtendente(
    supabase,
    enrichedMessage + priceHint,
    pushName || "Cliente",
    history as { role: "user" | "assistant"; content: string }[],
    { intent, stage, hasOrderInProgress },
    smartIntentOverride
  );

  // ── Processar blocos da IA ──
  const {
    replyClean,
    pedidoJson,
    encomendaJson,
    quitarEncomendaJson,
    atualizarClienteJson,
    alertaEquipeText,
  } = parseCreateBlocks(reply);

  const decorationText = extractDecorationRequestFromMessage(combinedMessage);
  const pedidoJsonWithDecoration = applyDecorationToPedidoPayload(
    pedidoJson,
    decorationText
  );
  const encomendaJsonWithDecoration = applyDecorationToEncomendaPayload(
    encomendaJson,
    decorationText
  );
  const guardedReplyClean = enforceReplyGuardrails(
    replyClean || reply,
    recipeNames,
    combinedMessage
  );

  // ── Processar ALERTA_EQUIPE ──
  if (alertaEquipeText && ownerPhonesList.length > 0) {
    const alertMsg = `⚠️ Alerta do atendente IA:\n${alertaEquipeText}\n\nCliente: ${pushName || "não identificado"} (${normalizedPhone})`;
    for (const ownerPhone of ownerPhonesList) {
      try {
        await sendEvolutionMessage(
          evo.baseUrl,
          evo.apiKey,
          evo.instance,
          ownerPhone,
          alertMsg
        );
      } catch (e) {
        console.error("ALERTA_EQUIPE send error:", (e as Error).message);
      }
    }
  }

  // ── Processar ATUALIZAR_CLIENTE ──
  if (atualizarClienteJson) {
    await processClientUpdate(
      supabase,
      atualizarClienteJson,
      normalizedPhone,
      pushName
    );
  }

  // ── Salvar payment_confirmations ──
  if (pedidoJsonWithDecoration) {
    try {
      const summary = buildTeamSummary({
        customerName:
          (pedidoJsonWithDecoration.customer_name as string) || pushName || "Cliente",
        customerPhone: normalizedPhone,
        orderType: (pedidoJsonWithDecoration.channel as string) || "pedido",
        items:
          (pedidoJsonWithDecoration.items as Array<{
            recipe_name?: string;
            quantity?: number;
            unit_type?: string;
            notes?: string;
          }>) || [],
        observations:
          (pedidoJsonWithDecoration.observations as string) || "",
        paymentMethod:
          (pedidoJsonWithDecoration.payment_method as string) || "",
        history: history as { role: "user" | "assistant"; content: string }[],
        currentMessage: combinedMessage,
        recipeNames,
      });
      await supabase.from("payment_confirmations").insert({
        customer_name:
          (pedidoJsonWithDecoration.customer_name as string) ||
          pushName ||
          "Cliente",
        customer_phone: normalizedPhone,
        remote_jid: remoteJid,
        description: summary.slice(0, 800),
        type: "pedido",
        channel: "whatsapp",
        status: "pending",
        order_payload: pedidoJsonWithDecoration,
      } as Record<string, unknown>);
      console.log(
        "evolution-webhook: comprovante de pedido salvo para aprovação manual"
      );
    } catch (e) {
      console.error("payment_confirmation insert:", (e as Error).message);
    }
  }

  if (encomendaJsonWithDecoration) {
    try {
      const summary = buildTeamSummary({
        customerName:
          (encomendaJsonWithDecoration.customer_name as string) ||
          pushName ||
          "Cliente",
        customerPhone: normalizedPhone,
        orderType: "encomenda",
        // Modalidade explícita quando a IA preenche; se não, a função infere
        // via endereço/histórico.
        deliveryMethod:
          (encomendaJsonWithDecoration.delivery_method as string) ||
          (encomendaJsonWithDecoration.modality as string) ||
          "",
        totalValue: Number(encomendaJsonWithDecoration.total_value) || 0,
        signalPaid: !!encomendaJsonWithDecoration.paid_50_percent,
        deliveryDate:
          (encomendaJsonWithDecoration.delivery_date as string) || "",
        deliveryTimeSlot:
          (encomendaJsonWithDecoration.delivery_time_slot as string) || "",
        address: (encomendaJsonWithDecoration.address as string) || "",
        paymentMethod:
          (encomendaJsonWithDecoration.payment_method as string) || "",
        observations:
          (encomendaJsonWithDecoration.observations as string) || "",
        productDescription:
          (encomendaJsonWithDecoration.product_description as string) || "",
        history: history as { role: "user" | "assistant"; content: string }[],
        currentMessage: combinedMessage,
        recipeNames,
      });
      await supabase.from("payment_confirmations").insert({
        customer_name:
          (encomendaJsonWithDecoration.customer_name as string) ||
          pushName ||
          "Cliente",
        customer_phone: normalizedPhone,
        remote_jid: remoteJid,
        description: summary.slice(0, 800),
        type: "encomenda",
        channel: "whatsapp",
        status: "pending",
        order_payload: encomendaJsonWithDecoration,
      } as Record<string, unknown>);
      console.log(
        "evolution-webhook: comprovante de encomenda salvo para aprovação manual"
      );
    } catch (e) {
      console.error("payment_confirmation insert:", (e as Error).message);
    }
  }

  if (quitarEncomendaJson) {
    const result = await settleEncomendaFromPayload(
      supabase,
      quitarEncomendaJson,
      normalizedPhone
    );
    if (result.ok) {
      console.log(
        "evolution-webhook: encomenda quitada na plataforma",
        result.encomendaId
      );
    } else {
      console.error(
        "evolution-webhook: falha ao quitar encomenda",
        result.error
      );
    }
  }

  // ── Auto-registro de comprovante (PDF) quando o LLM não emitiu bloco ──
  // Se o cliente mandou comprovante (PDF) e o LLM não gerou [CRIAR_PEDIDO]
  // nem [CRIAR_ENCOMENDA], ainda assim precisamos registrar na tela da equipe.
  // Garante que nenhum comprovante se perde.
  try {
    const gotPdf = hasPdfDocument(payload);
    if (
      gotPdf &&
      !pedidoJsonWithDecoration &&
      !encomendaJsonWithDecoration &&
      !quitarEncomendaJson
    ) {
      // Verifica se já existe um registro pendente recente pra este cliente
      // (evita duplicação quando cliente manda múltiplos PDFs).
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("payment_confirmations")
        .select("id")
        .eq("customer_phone", normalizedPhone)
        .eq("status", "pending")
        .gte("created_at", since)
        .limit(1);
      if (!existing || existing.length === 0) {
        const summary = buildTeamSummary({
          customerName: pushName || "Cliente",
          customerPhone: normalizedPhone,
          orderType: "encomenda",
          items: [],
          history: history as { role: "user" | "assistant"; content: string }[],
          currentMessage: combinedMessage,
          recipeNames,
        });
        await supabase.from("payment_confirmations").insert({
          customer_name: pushName || "Cliente",
          customer_phone: normalizedPhone,
          remote_jid: remoteJid,
          description: `📎 COMPROVANTE RECEBIDO (auto-registrado)\n\n${summary.slice(0, 700)}`,
          type: "encomenda",
          channel: "whatsapp",
          status: "pending",
          order_payload: null,
        } as Record<string, unknown>);
        console.log(
          "evolution-webhook: comprovante PDF auto-registrado para aprovação manual"
        );
      }
    }
  } catch (e) {
    console.error("auto-registro de PDF falhou:", (e as Error).message);
  }

  // ── Aplicar guardrails finais ──
  reply = guardedReplyClean || replyClean || reply;

  // v223: LOG pre-guardrail — gravar o que Claude REALMENTE respondeu
  try {
    await supabase.from("agent_debug_logs").insert({
      level: "info",
      source: "pre-guardrail-reply",
      message: `reply ANTES dos guardrails`,
      context: { reply_full: reply.slice(0, 2000), remote_jid: remoteJid, message: combinedMessage.slice(0, 200) } as Record<string, unknown>,
    } as Record<string, unknown>);
  } catch (_) { /* ignore */ }

  // Placeholder literal ("[produto do cardápio]", etc.) nunca sai pro cliente.
  // Roda bem cedo no pipeline.
  const replyBeforePlaceholder = reply;
  reply = enforceNoTemplatePlaceholders(reply);
  if (reply !== replyBeforePlaceholder) {
    // v242 — log mais preciso: distinguir entre limpeza inline bem-sucedida
    // (só remove a sentence com placeholder, preserva o resto) versus o
    // fallback genérico "me confundi". Antes o log sempre dizia "me confundi".
    const usedFallback = reply
      .toLowerCase()
      .includes("opa, me confundi aqui");
    try {
      await supabase.from("agent_debug_logs").insert({
        level: "warn",
        source: "guardrail.enforceNoTemplatePlaceholders",
        message: usedFallback
          ? `FALLBACK 'me confundi' aplicado (nada aproveitável)`
          : `LIMPEZA INLINE aplicada (placeholder removido, resto preservado)`,
        context: {
          original_reply: replyBeforePlaceholder.slice(0, 2000),
          new_reply: reply.slice(0, 2000),
          remote_jid: remoteJid,
        } as Record<string, unknown>,
      } as Record<string, unknown>);
    } catch (_) { /* ignore */ }
  }

  // Saudação inicial: força template canônico (bem-vindo + cardápio + modalidade).
  // Se há pedido em aberto, força "Oi novamente, tem pedido aberto...".
  try {
    const clientIsGreetingNow = intent === "greeting";
    // "Primeira interação": histórico antes desta mensagem tem <=1 turno do atendente.
    const prevAssistantCount = history.filter(
      (h) => (h as { role?: string }).role === "assistant"
    ).length;
    const isFirstInteraction = prevAssistantCount <= 1;
    // Pedido em aberto: checkOpenOrders já rodou anteriormente (openOrderHint != "").
    const hasOpenOrderPending = !!openOrderHint;
    reply = enforceWelcomeTemplate(reply, {
      clientIsGreeting: clientIsGreetingNow,
      isFirstInteraction,
      hasOpenOrderPending,
      clientName: pushName || undefined,
    });
  } catch (e) {
    console.error("enforceWelcomeTemplate error:", (e as Error).message);
  }

  // Se o LLM retornou FALLBACK_ATENDENTE por timeout/erro, substituímos por
  // uma resposta determinística baseada na intent interpretada. Roda ANTES
  // dos demais guardrails pra que eles atuem sobre a resposta substituída.
  try {
    const interpEarly = interpretMessage({
      message: combinedMessage,
      history: history as { role: "user" | "assistant"; content: string }[],
      recipes: recipeRowsTyped,
      hasPdfAttachment: hasPdfDocument(payload),
    });
    reply = enforceSmartFallback(reply, {
      intent: interpEarly.intent,
      next_action: interpEarly.next_action,
      entities: {
        flavor: interpEarly.entities.flavor,
        weight_kg: interpEarly.entities.weight_kg,
        mini_savory_qty: interpEarly.entities.mini_savory_qty,
        writing_phrase: interpEarly.entities.writing_phrase,
        order_type: interpEarly.entities.order_type,
      },
    });
  } catch (e) {
    console.error("enforceSmartFallback error:", (e as Error).message);
  }

  reply = enforceOrderTypeQuestion(reply, intent, stage, combinedMessage);
  reply = enforceCakeContinuity(
    reply,
    combinedMessage,
    history as { role: "user" | "assistant"; content: string }[]
  );
  // Se o agente "rejeitou" um fragmento funcional/temporal/escrita como
  // se fosse sabor (ex.: "sabor 'ser as' não temos", "sabor 'amo voce'
  // não temos"), trocamos por pergunta aberta. Passa a mensagem atual e
  // o cardápio real para validar se o "sabor rejeitado" é plausível.
  reply = enforceNoFragmentAsFlavor(reply, combinedMessage, recipeNames);
  // Remove "escrita personalizada / +R$15" fantasma (cliente não pediu).
  reply = enforcePhantomWritingRemoval(
    reply,
    combinedMessage,
    history as { role: "user" | "assistant"; content: string }[]
  );
  // Sinaliza se o resumo do pedido "esqueceu" bolo/salgados/docinhos do histórico.
  reply = enforceOrderSummaryCompleteness(
    reply,
    history as { role: "user" | "assistant"; content: string }[]
  );
  // Em encomendas, antes de pedir endereço garante que o cliente escolheu
  // entrega ou retirada. Se o pedido tem bolo de 4kg, força retirada.
  reply = enforceEncomendaDeliveryQuestion(
    reply,
    combinedMessage,
    history as { role: "user" | "assistant"; content: string }[]
  );
  // Impede a resposta de misturar "Gostaria de mais alguma coisa?" com
  // instruções de Pix/sinal 50% antes do cliente confirmar o fechamento.
  reply = enforceAskBeforePayment(
    reply,
    combinedMessage,
    history as { role: "user" | "assistant"; content: string }[]
  );
  // Se mesmo assim a resposta contém "Total:" / "Anotei + valor" sem pedir
  // "mais alguma coisa?", anexa a pergunta (cliente ainda não disse "só isso").
  reply = enforceAskMoreBeforeClosure(
    reply,
    combinedMessage,
    history as { role: "user" | "assistant"; content: string }[]
  );
  // Detecta resumos com itens picotados ("R$545" sozinho sem item) e
  // quantidades trocadas vs. histórico do cliente ("50 empadas" → "13").
  reply = enforceOrderSummarySanity(
    reply,
    history as { role: "user" | "assistant"; content: string }[]
  );

  // ── Interpretação determinística + alinhamento com resposta ──
  // Rede final de segurança: se a intent detectada prevê uma next_action
  // mas a resposta do LLM vai em outra direção, substituímos por algo
  // alinhado. Isto tira do LLM a decisão sobre o fluxo principal.
  try {
    const interp = interpretMessage({
      message: combinedMessage,
      history: history as { role: "user" | "assistant"; content: string }[],
      recipes: recipeRowsTyped,
      hasPdfAttachment: hasPdfDocument(payload),
    });
    const lastA = [...(history as { role: string; content: string }[])]
      .reverse()
      .find((h) => h.role === "assistant");
    const lastANorm = lastA
      ? (lastA.content || "").toLowerCase()
      : "";
    reply = enforceIntentAlignment(reply, {
      intent: interp.intent,
      next_action: interp.next_action,
      entities: {
        flavor: interp.entities.flavor,
        weight_kg: interp.entities.weight_kg,
        writing_phrase: interp.entities.writing_phrase,
      },
      client_short_affirmation: interp.intent === "confirm_more" || interp.intent === "payment_done",
      last_assistant_had_pix:
        /\bpix\b/.test(lastANorm) ||
        lastANorm.includes("chave pix") ||
        lastANorm.includes("comprovante") ||
        /\b50\s*%/.test(lastANorm),
    });
  } catch (e) {
    console.error("interpretMessage error:", (e as Error).message);
  }
  // Após mandar o PIX e receber só um "ok"/"beleza"/"vou pagar" do cliente,
  // não repetir o resumo do pedido — só aguardar o comprovante.
  reply = enforceNoRepeatAfterPix(
    reply,
    combinedMessage,
    history as { role: "user" | "assistant"; content: string }[]
  );
  // Bloqueia preços malformados ("R$15,008,00") ou absurdamente altos.
  reply = enforceSanePrices(reply);
  // Se a resposta manda PIX com valor total > R$300 sem mencionar sinal 50%,
  // adiciona a linha do sinal.
  reply = enforceSignalWhenLargeOrder(reply);
  // Bloqueia repetição exata/quase-exata da última resposta do atendente.
  reply = enforceNoExactRepeat(
    reply,
    history as { role: "user" | "assistant"; content: string }[]
  );
  // Se o cliente só mandou uma SAUDAÇÃO nova, não reativa pedido antigo —
  // responde com cumprimento simples.
  reply = enforceGreetingReset(
    reply,
    combinedMessage,
    history as { role: "user" | "assistant"; content: string }[],
    sessionMemory
  );

  // ── Guardrail: remover "Oi" repetido no início (exceto primeira saudação) ──
  // \b garante que "Oitavo", "Oito" e palavras maiores não sejam mutiladas —
  // só remove quando "Oi" é palavra isolada seguida de pontuação, emoji ou espaço.
  const isFirstMessage = history.length <= 1;
  if (!isFirstMessage && intent !== "greeting") {
    const before = reply;
    reply = reply.replace(/^\s*oi\b\s*[!,.]?\s*(?:😊|🙂|👋)?\s*[\n-]*\s*/i, "").trim();
    if (reply.length > 0 && reply !== before) {
      reply = reply.charAt(0).toUpperCase() + reply.slice(1);
    }
  }

  // ── Salvar sessão ──
  // Se novo pedido, extrair APENAS da mensagem atual (não do histórico antigo)
  const historyForExtraction = clientWantsNew
    ? []
    : (history as { role: "user" | "assistant"; content: string }[]);
  const extractedOrder = extractOrderMemory(historyForExtraction);
  const clientTextForSession = clientWantsNew
    ? combinedMessage
    : (history as { role: "user" | "assistant"; content: string }[])
        .filter((h) => h.role === "user")
        .map((h) => h.content || "")
        .join("\n") +
      "\n" +
      combinedMessage;

  // Apenas extraímos peso/sabor da ÚLTIMA mensagem do cliente (ou um reset recente).
  // Se pegarmos do histórico inteiro, mudanças de ideia ("quero 2kg... na verdade 3kg")
  // sempre tomariam o último kg como "confirmado" — o que pode não refletir o estado
  // combinado com o atendente. Só sobrescrevemos o valor já salvo na sessão quando a
  // mensagem atual traz um novo peso/sabor.
  const sessionWeights = [
    ...combinedMessage.matchAll(/(\d+)\s*kg/gi),
  ].map((m) => `${m[1]}kg`);
  // Se a mensagem atual é sobre ESCRITA no bolo ("escrita em cima do bolo
  // amo voce"), NÃO extraímos sabor dela — a frase é conteúdo da escrita.
  const currentIsWriting = messageIsAboutWriting(combinedMessage);
  // Palavras que indicam DECORAÇÃO e que NÃO devem entrar em "confirmed_flavor".
  // Também cortamos tokens temporais ("amanhã", "hoje", "horas", "segunda",
  // "as", "às", etc.) — frases como "pode ser as 9" NÃO geram sabor "ser as".
  const DECO_BOUNDARY =
    /\b(com\s+(?:decorac|decora|flores?|florzinhas?|bolinhas?|cores?|colorid|confeit|granulad|topo|chantininho|pasta\s*americana|papel\s*de\s*arroz|personaliz|tematic|tema\s+|escrita|homem\s+aranha|princesa|patrulha|frozen|minnie|mickey|super\s+heroi)|decorac|decora(?:da|do)\b|colorid|florid|flores?\b|bolinhas?\b|confeito|granulad|personaliz|tematic|chantininho|pasta\s*americana|papel\s*de\s*arroz)/i;
  const BAD_FLAVOR_TOKEN =
    /\b(?:as|às|pra|para|com|de|do|da|dos|das|ate|até|por|em|no|na|hoje|amanha|amanhã|manha|manhã|tarde|noite|hora|horas|horario|horário|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo)\b/;
  const cleanFlavor = (raw: string): string => {
    let f = raw.trim();
    const decoIdx = f.search(DECO_BOUNDARY);
    if (decoIdx >= 0) f = f.slice(0, decoIdx).trim();
    // Remove filler: "um/uma bolo de", "bolo de", artigos, peso inicial.
    f = f.replace(/^(?:um\s+|uma\s+)?bolo\s+(?:de\s+)?/i, "").trim();
    f = f.replace(/^(?:um|uma|o|a)\s+/i, "").trim();
    f = f.replace(/^\d+\s*(?:kg|quilos?|kilos?)\s+(?:de\s+)?/i, "").trim();
    const parts = f.split(/\s+/);
    const firstBad = parts.findIndex((p) => BAD_FLAVOR_TOKEN.test(p));
    if (firstBad === 0) return "";
    if (firstBad > 0) f = parts.slice(0, firstBad).join(" ");
    return f.replace(/\s{2,}/g, " ").trim();
  };
  // Padrão explícito: "sabor do bolo é X" / "sabor é X" / "sabor: X"
  const explicitFlavor =
    combinedMessage.match(
      /(?:o\s+)?sabor\s+(?:do\s+bolo\s+)?(?:é|e|eh|sera|será|vai\s+ser|ficou|escolhi|fica|escolho)\s*[:\-]?\s*([a-záàâãéèêíïóôõúüç][a-záàâãéèêíïóôõúüç\s]*)/i
    ) ||
    combinedMessage.match(/\bsabor\s*[:\-]\s*([a-záàâãéèêíïóôõúüç][a-záàâãéèêíïóôõúüç\s]*)/i);
  let explicitFlavorClean = "";
  if (explicitFlavor && explicitFlavor[1]) {
    explicitFlavorClean = cleanFlavor(explicitFlavor[1]);
  }
  // Em mensagens que são sobre ESCRITA no bolo, NÃO extraímos sabor do texto:
  // a string que vem junto é o conteúdo da escrita, não sabor.
  const sessionFlavors = currentIsWriting
    ? []
    : explicitFlavorClean
      ? [explicitFlavorClean]
      : [
          ...combinedMessage.matchAll(
            /(?:bolo\s+(?:de\s+)?|pode\s+ser\s+(?:de\s+)?|vai\s+ser\s+(?:de\s+)?|quero\s+(?:de\s+)?|o\s+de\s+)([a-záàâãéèêíïóôõúüç0-9\s]+)/gi
          ),
        ]
          .map((m) => cleanFlavor(m[1]))
          .filter((f) => f.length > 2 && !f.match(/^\d/));
  const sessionOrderType = clientTextForSession.toLowerCase().includes("delivery")
    ? "delivery"
    : clientTextForSession.toLowerCase().includes("encomenda")
      ? "encomenda"
      : clientTextForSession.toLowerCase().includes("retirada")
        ? "retirada"
        : (sessionMemory.order_type as string) || "";

  // ── Detectar tópico atual para persistir na sessão ──
  const msgLowerForTopic = combinedMessage.toLowerCase();
  let currentTopic = (sessionMemory.current_topic as string) || "";
  if (/\b(salgad|coxinha|kibe|quibe|risole|bolinha|empada|esfiha)\b/i.test(msgLowerForTopic)) {
    currentTopic = "salgados";
  } else if (/\b(bolo|torta|fatia|massa)\b/i.test(msgLowerForTopic)) {
    currentTopic = "bolo";
  } else if (/\b(doce|docinho|brigadeiro|beijinho)\b/i.test(msgLowerForTopic)) {
    currentTopic = "doces";
  } else if (/\b(acai|açaí)\b/i.test(msgLowerForTopic)) {
    currentTopic = "acai";
  }

  const sessionUpdate: Record<string, unknown> = {
    memory: {
      last_message: combinedMessage.slice(0, 300),
      last_reply: reply.slice(0, 300),
      last_intent: intent,
      stage,
      current_topic: currentTopic,
      evo_instance: evo.instance,
      // v242: preservar marcador de reset pra próximos turnos filtrarem
      // histórico antigo do banco.
      conversation_reset_at:
        (sessionMemory.conversation_reset_at as string | undefined) || "",
      confirmed_weight:
        sessionWeights.length > 0
          ? sessionWeights[sessionWeights.length - 1]
          : sessionMemory.confirmed_weight || "",
      confirmed_flavor:
        sessionFlavors.length > 0
          ? sessionFlavors[sessionFlavors.length - 1]
          : sessionMemory.confirmed_flavor || "",
      order_type: sessionOrderType || (sessionMemory.order_type || ""),
      order_items: extractedOrder.items.slice(-12),
      updated: new Date().toISOString(),
    },
    customer_name: pushName || (sessionRow as any)?.customer_name || null,
    updated_at: new Date().toISOString(),
  };

  if (sessionRow) {
    await supabase
      .from("sessions")
      .update(sessionUpdate as any)
      .eq("remote_jid", remoteJid);
  } else {
    try {
      await supabase
        .from("sessions")
        .insert({
          remote_jid: remoteJid,
          ...sessionUpdate,
        } as Record<string, unknown>);
    } catch (_) {
      /* ignore duplicate */
    }
  }

  // Salvar resposta
  await supabase.from("crm_messages").insert({
    customer_id: customerId,
    message_type: "whatsapp_saida",
    message_content: reply,
    status: "enviada",
    sent_at: new Date().toISOString(),
  });

  return { reply };
}
