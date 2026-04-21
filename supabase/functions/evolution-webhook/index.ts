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
} from "../_shared/webhookUtils.ts";

// ── Módulos de conversa ──
import {
  extractOrderMemory,
  buildOrderMemoryHint,
  enforceCakeContinuity,
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
  extractDecorationRequestFromMessage,
  applyDecorationToPedidoPayload,
  applyDecorationToEncomendaPayload,
} from "../_shared/priceEngine.ts";

// ── Módulos de API ──
import { sendEvolutionMessage } from "../_shared/evolutionApi.ts";

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
      } catch (_) {
        /* ignore duplicate */
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
  let history: { role: string; content: string }[] = [];
  if (!instanceChanged) {
    const { data: historyRows } = await supabase
      .from("crm_messages")
      .select("message_type, message_content, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(20);

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
  const clientWantsNew = wantsNewOrder(combinedMessage);

  if (clientWantsNew) {
    console.log("evolution-webhook: cliente pediu NOVO pedido → reset de sessão", remoteJid);
    // Limpar memória da sessão para não arrastar pedido anterior
    sessionMemory = { evo_instance: evo.instance };
    // Limpar histórico para a LLM não puxar itens antigos
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
      openOrderHint = `[DADOS_PEDIDO_ABERTO]\n${orderSummary}\n\n⚠️ INSTRUÇÃO OBRIGATÓRIA: O cliente tem um pedido em aberto. Você DEVE cumprimentar e PERGUNTAR:\n"Oi, [Nome]! Tudo bem? Vi que você tem um pedido em aberto. Quer continuar com ele ou prefere fazer um novo?"\nNÃO continue o pedido automaticamente. ESPERE o cliente responder.\n[/DADOS_PEDIDO_ABERTO]`;
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
      await supabase.from("payment_confirmations").insert({
        customer_name:
          (pedidoJsonWithDecoration.customer_name as string) ||
          pushName ||
          "Cliente",
        customer_phone: normalizedPhone,
        remote_jid: remoteJid,
        description: JSON.stringify(
          pedidoJsonWithDecoration.items || []
        ).slice(0, 500),
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
      await supabase.from("payment_confirmations").insert({
        customer_name:
          (encomendaJsonWithDecoration.customer_name as string) ||
          pushName ||
          "Cliente",
        customer_phone: normalizedPhone,
        remote_jid: remoteJid,
        description:
          (encomendaJsonWithDecoration.product_description as string) ||
          "Encomenda",
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

  // ── Aplicar guardrails finais ──
  reply = guardedReplyClean || replyClean || reply;
  reply = enforceOrderTypeQuestion(reply, intent, stage, combinedMessage);
  reply = enforceCakeContinuity(
    reply,
    combinedMessage,
    history as { role: "user" | "assistant"; content: string }[]
  );

  // ── Guardrail: remover "Oi" repetido no início (exceto primeira saudação) ──
  const isFirstMessage = history.length <= 1;
  if (!isFirstMessage && intent !== "greeting") {
    // Remove "Oi! 😊 " or "Oi! " or "Oi, " from start
    reply = reply.replace(/^Oi!?\s*😊?\s*/i, "").trim();
    // Also remove "Oi! 😊 " variants with emoji
    reply = reply.replace(/^Oi!\s*😊\s*/i, "").trim();
    // Capitalize first letter after removal
    if (reply.length > 0) {
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

  const sessionWeights = [
    ...clientTextForSession.matchAll(/(\d+)\s*kg/gi),
  ].map((m) => `${m[1]}kg`);
  const sessionFlavors = [
    ...clientTextForSession.matchAll(
      /(?:bolo\s+(?:de\s+)?|pode\s+ser\s+(?:de\s+)?|vai\s+ser\s+(?:de\s+)?|quero\s+(?:de\s+)?|o\s+de\s+)([a-záàâãéèêíïóôõúüç\s]+)/gi
    ),
  ]
    .map((m) => m[1].trim())
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
