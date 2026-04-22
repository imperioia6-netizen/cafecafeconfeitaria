/**
 * conversationMemory.ts — Gerenciamento de memória de conversa e pedido.
 * Extrai itens, pesos, sabores do histórico para evitar re-perguntas.
 *
 * SEGURANÇA:
 * - Todos os regex são limitados em escopo para evitar ReDoS.
 * - Strings extraídas são truncadas antes de uso.
 */

import { normalizeForCompare } from "./webhookUtils.ts";
import { messageIsAboutWriting } from "./priceEngine.ts";

// ── Tipos ──

export interface OrderMemory {
  hasCake: boolean;
  hasSalgados: boolean;
  items: string[];
}

// ── Funções auxiliares ──

export function buildRecentHistoryHint(
  history: { role: "user" | "assistant"; content: string }[]
): string {
  const recent = history.slice(-6);
  if (recent.length === 0) return "";
  const lines = recent.map(
    (h) => `${h.role === "user" ? "cliente" : "atendente"}: ${h.content.slice(0, 180)}`
  );
  return lines.join("\n");
}

/**
 * Extrai itens de pedido mencionados no histórico via regex.
 * Detecta bolos, salgados, açaí, docinhos, fatias e totais.
 */
export function extractOrderMemory(
  history: { role: "user" | "assistant"; content: string }[]
): OrderMemory {
  const text = history.map((h) => h.content || "").join("\n");
  const items: string[] = [];

  // Bolos com kg
  const cakeMatches = text.match(/bolo[^\n]*\d+\s*kg[^\n]*/gi) || [];
  // Bolos por sabor
  const cakeNameMatches =
    text.match(/bolo\s+(?:de\s+)?[a-záàâãéèêíïóôõúüç\s]+(?:\d+\s*kg)?/gi) || [];
  // Mini salgados
  const miniMatches = text.match(/\d+\s*mini[^\n]*/gi) || [];
  // Salgados por nome
  const salgadoMatches =
    text.match(
      /\d+\s*(?:mini\s+)?(?:coxinha|quibe|bolinha|risole|empada|esfiha|enrolado|kibe)[^\n]*/gi
    ) || [];
  // Quantidades genéricas
  const salgadoGenMatches = text.match(/\d+\s*(?:mini\s+)?salgados?[^\n]*/gi) || [];
  // Açaí
  const acaiMatches = text.match(/acai[^\n]*/gi) || text.match(/açaí[^\n]*/gi) || [];
  // Docinhos
  const docinhoMatches =
    text.match(/\d+\s*(?:brigadeiro|beijinho|cajuzinho|docinho)[^\n]*/gi) || [];
  // Fatias
  const fatiaMatches = text.match(/\d+\s*fatia[^\n]*/gi) || [];
  // Totais mencionados
  const totalMatches = text.match(/total[:\s]*r\$\s*[\d.,]+/gi) || [];

  const allMatches = [
    ...cakeMatches,
    ...cakeNameMatches,
    ...miniMatches,
    ...salgadoMatches,
    ...salgadoGenMatches,
    ...acaiMatches,
    ...docinhoMatches,
    ...fatiaMatches,
    ...totalMatches,
  ];

  for (const m of allMatches) {
    const cleaned = m.replace(/\s+/g, " ").trim().slice(0, 200);
    if (cleaned.length >= 5) items.push(cleaned);
  }

  const dedup = [...new Set(items)];
  const norm = dedup.map((i) => normalizeForCompare(i));
  const hasCake = norm.some((i) => i.includes("bolo"));
  const hasSalgados = norm.some(
    (i) =>
      i.includes("salgado") ||
      i.includes("mini") ||
      i.includes("coxinha") ||
      i.includes("quibe") ||
      i.includes("risole")
  );

  return { hasCake, hasSalgados, items: dedup.slice(-12) };
}

/**
 * Constrói hint de memória do pedido com detalhes já confirmados.
 * Evita que o LLM re-pergunte informações já fornecidas pelo cliente.
 */
export function buildOrderMemoryHint(
  history: { role: "user" | "assistant"; content: string }[],
  sessionMemory?: Record<string, unknown>
): string {
  const mem = extractOrderMemory(history);

  // Para cada mensagem do cliente, ignoramos aquelas que são sobre ESCRITA
  // no bolo — essas frases trazem TEXTO, não sabor ("escrita em cima do bolo
  // amo voce" NÃO dá sabor "amo voce").
  const clientText = history
    .filter((h) => h.role === "user")
    .map((h) => h.content || "")
    .filter((c) => !messageIsAboutWriting(c))
    .join("\n");

  // Pesos mencionados
  const allWeights = [...clientText.matchAll(/(\d+)\s*kg/gi)].map((m) => `${m[1]}kg`);
  const regexWeight = allWeights.length > 0 ? allWeights[allWeights.length - 1] : "";
  const confirmedWeight = regexWeight || (sessionMemory?.confirmed_weight as string) || "";

  // Sabores — cortamos na primeira palavra de DECORAÇÃO para não misturar
  // descrição visual com sabor. "morango com decoração de flores" → "morango".
  const DECO_BOUNDARY =
    /\b(com\s+(?:decorac|decora|flores?|florzinhas?|bolinhas?|cores?|colorid|confeit|granulad|topo|chantininho|pasta\s*americana|papel\s*de\s*arroz|personaliz|tematic|tema\s+|escrita|homem\s+aranha|princesa|patrulha|frozen|minnie|mickey|super\s+heroi)|decorac|decora(?:da|do)\b|colorid|florid|flores?\b|bolinhas?\b|confeito|granulad|personaliz|tematic|chantininho|pasta\s*americana|papel\s*de\s*arroz)/i;
  // Frase "o sabor do bolo é X" / "o sabor é X" / "sabor: X" é sinal forte e
  // vem em PRIMEIRO lugar — se existir, ganha das outras capturas.
  const explicitFlavorMatch = clientText.match(
    /(?:o\s+)?sabor\s+(?:do\s+bolo\s+)?(?:é|e|eh|sera|será|vai\s+ser|ficou|escolhi|fica|escolho)\s*[:\-]?\s*([a-záàâãéèêíïóôõúüç][a-záàâãéèêíïóôõúüç\s]*)/i
  ) || clientText.match(/\bsabor\s*[:\-]\s*([a-záàâãéèêíïóôõúüç][a-záàâãéèêíïóôõúüç\s]*)/i);
  const flavorMatches = [
    ...clientText.matchAll(
      /(?:bolo\s+(?:de\s+)?|pode\s+ser\s+(?:de\s+)?|vai\s+ser\s+(?:de\s+)?|quero\s+(?:de\s+)?|o\s+de\s+)([a-záàâãéèêíïóôõúüç0-9\s]+)/gi
    ),
  ];
  // Palavras funcionais/temporais que NÃO podem ser sabor.
  const BAD_FLAVOR_TOKEN =
    /\b(?:as|às|pra|para|com|de|do|da|dos|das|ate|até|por|em|no|na|hoje|amanha|amanhã|manha|manhã|tarde|noite|hora|horas|horario|horário|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo)\b/;
  const clean = (s: string): string => {
    let f = s.trim();
    const i = f.search(DECO_BOUNDARY);
    if (i >= 0) f = f.slice(0, i).trim();
    // Remove "filler" inicial: artigos e "bolo de" que não fazem parte do sabor.
    // Ex.: "um bolo de brigadeiro" → "brigadeiro".
    f = f.replace(/^(?:um\s+|uma\s+)?bolo\s+(?:de\s+)?/i, "").trim();
    f = f.replace(/^(?:um|uma|o|a)\s+/i, "").trim();
    // Peso no início ("4kg trufado" → "trufado").
    f = f.replace(/^\d+\s*(?:kg|quilos?|kilos?)\s+(?:de\s+)?/i, "").trim();
    const parts = f.split(/\s+/);
    const firstBad = parts.findIndex((p) => BAD_FLAVOR_TOKEN.test(p));
    if (firstBad === 0) return "";
    if (firstBad > 0) f = parts.slice(0, firstBad).join(" ");
    return f.replace(/\s{2,}/g, " ").trim();
  };
  let regexFlavor = "";
  if (explicitFlavorMatch && explicitFlavorMatch[1]) {
    regexFlavor = clean(explicitFlavorMatch[1]);
  }
  if (!regexFlavor) {
    const flavors = flavorMatches
      .map((m) => clean(m[1]))
      .filter((f) => f.length > 2 && !f.match(/^\d/));
    regexFlavor = flavors.length > 0 ? flavors[flavors.length - 1] : "";
  }
  const confirmedFlavor = regexFlavor || (sessionMemory?.confirmed_flavor as string) || "";

  // Quantidade de salgados
  const salgadoQty = [
    ...clientText.matchAll(/(\d+)\s*(?:mini|salgado|coxinha|quibe)/gi),
  ].map((m) => m[1]);
  const confirmedSalgadoQty = salgadoQty.length > 0 ? salgadoQty[salgadoQty.length - 1] : "";

  // Tipo de pedido
  const regexOrderType = clientText.toLowerCase().includes("delivery")
    ? "delivery"
    : clientText.toLowerCase().includes("encomenda")
      ? "encomenda"
      : clientText.toLowerCase().includes("retirada")
        ? "retirada"
        : "";
  const orderType = regexOrderType || (sessionMemory?.order_type as string) || "";

  // Itens persistidos da sessão como fallback
  const sessionItems = (sessionMemory?.order_items as string[]) || [];
  const allItems = mem.items.length > 0 ? mem.items : sessionItems;

  if (
    allItems.length === 0 &&
    !confirmedWeight &&
    !confirmedFlavor &&
    !confirmedSalgadoQty &&
    !orderType
  ) {
    return "";
  }

  // Perguntas pendentes
  const lastAssistantMsg = [...history].reverse().find((h) => h.role === "assistant");
  const pendingQuestions: string[] = [];
  if (lastAssistantMsg?.content?.includes("?")) {
    const questions = lastAssistantMsg.content.match(/[^.!]*\?/g) || [];
    pendingQuestions.push(...questions.map((q) => q.trim()));
  }

  const details: string[] = [];
  if (confirmedWeight)
    details.push(`PESO: ${confirmedWeight} (já informado — NÃO pergunte de novo)`);
  if (confirmedFlavor)
    details.push(`SABOR: ${confirmedFlavor} (já informado — NÃO pergunte de novo)`);
  if (confirmedSalgadoQty)
    details.push(
      `SALGADOS: ${confirmedSalgadoQty} unidades (já informado — NÃO pergunte de novo)`
    );
  if (orderType)
    details.push(`TIPO: ${orderType} (já informado — NÃO pergunte de novo)`);

  return `[MEMORIA_DO_PEDIDO_EM_ANDAMENTO]
${allItems.length > 0 ? `Itens já citados/confirmados na conversa:\n${allItems.map((i) => `- ${i}`).join("\n")}` : ""}

DETALHES JÁ CONFIRMADOS PELO CLIENTE (usar sem re-perguntar):
${details.length > 0 ? details.map((d) => `✓ ${d}`).join("\n") : "(nenhum detalhe específico extraído)"}
${pendingQuestions.length > 0 ? `\nPERGUNTAS PENDENTES (última resposta do atendente):\n${pendingQuestions.map((q) => `? ${q}`).join("\n")}` : ""}

REGRA DE OURO: Antes de fazer QUALQUER pergunta, verifique se a resposta já está nos detalhes acima. Se estiver, USE a informação e NÃO pergunte.
[/MEMORIA_DO_PEDIDO_EM_ANDAMENTO]`;
}

// ── Guardrail: resumo do pedido precisa conter todos os itens mencionados ──

/**
 * Detecta se a resposta parece ser um RESUMO de pedido (lista de itens, total)
 * e valida que bolo/salgados/docinhos mencionados no histórico estão presentes.
 * Se algum item do histórico sumir do resumo, anexa uma nota visível para o
 * atendente corrigir, em vez de enviar uma lista errada ao cliente.
 *
 * Abordagem conservadora: NÃO reescreve o resumo (preserva texto da LLM), mas
 * ADICIONA uma nota "⚠️ conferir itens" quando detecta omissão clara. Isso
 * cobre o caso "esqueci o bolo no resumo" sem arriscar criar um item novo.
 */
export function enforceOrderSummaryCompleteness(
  replyText: string,
  history: { role: "user" | "assistant"; content: string }[]
): string {
  if (!replyText) return replyText;

  const rep = normalizeForCompare(replyText);

  // 1. A resposta parece um resumo/fechamento do pedido?
  const looksLikeSummary =
    /\btotal\b/.test(rep) ||
    /resumo\s+(?:do\s+)?pedido/.test(rep) ||
    /pedido\s+(?:completo|ficou|resumindo)/.test(rep) ||
    /\bfechou\b/.test(rep);
  if (!looksLikeSummary) return replyText;

  // 2. Quais categorias de item o cliente mencionou no histórico?
  const mem = extractOrderMemory(history);
  const missing: string[] = [];
  if (mem.hasCake && !/\bbolo[s]?\b/.test(rep)) missing.push("bolo");
  if (
    mem.hasSalgados &&
    !/\b(mini|salgad|coxinha|quibe|kibe|risole|empada|bolinha)/.test(rep)
  )
    missing.push("salgados");
  // Docinhos
  const hasSweetsInHistory = mem.items.some((i) =>
    /\b(brigadeiro|beijinho|cajuzinho|docinho)/i.test(i)
  );
  if (hasSweetsInHistory && !/\b(docinho|brigadeiro|beijinho|cajuzinho)/.test(rep)) {
    missing.push("docinhos");
  }

  if (missing.length === 0) return replyText;

  // 3. Injetar aviso no final para o cliente/atendente perceber.
  const nota = `\n\n⚠️ Opa, parece que esqueci de listar ${missing.join(
    " e "
  )} no resumo — deixa eu conferir seus itens antes de fechar. Pode me confirmar se todos estão aí?`;
  return `${replyText.trimEnd()}${nota}`;
}

/**
 * Garante continuidade quando cliente pergunta sobre itens do pedido.
 * Se o LLM "esqueceu" o bolo/salgados, injeta resumo.
 */
export function enforceCakeContinuity(
  replyText: string,
  fullMessage: string,
  history: { role: "user" | "assistant"; content: string }[]
): string {
  const msg = normalizeForCompare(fullMessage);

  const asksCakeFollowup =
    msg.includes("meu bolo") ||
    msg.includes("e o bolo") ||
    msg.includes("e meu bolo") ||
    msg.includes("cade o bolo") ||
    msg.includes("cadê o bolo") ||
    msg.includes("esqueceu o bolo") ||
    msg.includes("e o pedido") ||
    msg.includes("meu pedido");
  const asksSalgadoFollowup =
    msg.includes("meus salgados") ||
    msg.includes("e os salgados") ||
    msg.includes("e meus salgados");

  if (!asksCakeFollowup && !asksSalgadoFollowup) return replyText;

  const mem = extractOrderMemory(history);
  if (mem.items.length === 0) return replyText;

  const rep = normalizeForCompare(replyText);

  if (asksCakeFollowup && rep.includes("bolo") && mem.hasCake) return replyText;
  if (
    asksSalgadoFollowup &&
    (rep.includes("salgado") || rep.includes("mini")) &&
    mem.hasSalgados
  )
    return replyText;

  const itemsList = mem.items
    .filter((i) => {
      const n = normalizeForCompare(i);
      return (
        n.includes("bolo") ||
        n.includes("mini") ||
        n.includes("salgado") ||
        n.includes("coxinha") ||
        n.includes("quibe")
      );
    })
    .map((i) => `• ${i}`)
    .join("\n");

  if (!itemsList) return replyText;

  return `Não esqueci! 😊 Seu pedido até agora:\n${itemsList}\n\nQuer confirmar tudo ou mudar alguma coisa?`;
}

/**
 * Detecta se a mensagem atual parece resposta a uma pergunta anterior do atendente.
 * Resolve contexto para respostas curtas ("2kg", "chocolate", "sim").
 */
export function buildPreviousQuestionHint(
  history: { role: "user" | "assistant"; content: string }[],
  currentMessage: string
): string {
  const msg = (currentMessage || "").trim();
  if (!msg || msg.length > 120) return "";

  const assistantMsgs = history
    .map((h, idx) => ({ ...h, idx }))
    .filter(
      (h) => h.role === "assistant" && !!h.content?.trim() && h.content.includes("?")
    );

  if (assistantMsgs.length === 0) return "";

  const recentQuestions = assistantMsgs.slice(-4);
  const hints: string[] = [];

  for (const q of recentQuestions) {
    const subsequentUserMsgs = history.slice(q.idx + 1).filter((h) => h.role === "user");

    const questionNorm = normalizeForCompare(q.content);

    const asksFlavor =
      questionNorm.includes("sabor") || questionNorm.includes("qual sabor");
    const asksWeight =
      questionNorm.includes("peso") ||
      questionNorm.includes("quantos kg") ||
      questionNorm.includes("qual peso");
    const asksOrderType =
      questionNorm.includes("encomenda") &&
      questionNorm.includes("delivery") &&
      questionNorm.includes("retirada");

    const wasAnswered = subsequentUserMsgs.some((u) => {
      const uNorm = normalizeForCompare(u.content);
      if (asksFlavor) {
        return (
          uNorm.includes("sabor") ||
          /bolo\s+de\s+\w/.test(uNorm) ||
          /(?:pode\s+ser|vai\s+ser|quero|o\s+de|de)\s+[a-záàâãéèêíïóôõúüç]{3,}/i.test(
            uNorm
          ) ||
          /(?:chocolate|morango|ninho|brigadeiro|mousse|maracuja|limao|coco|cenoura|red\s*velvet|prestígio|prestigio|abacaxi|doce\s+de\s+leite)/i.test(
            uNorm
          )
        );
      }
      if (asksWeight) return /\d+\s*kg/.test(uNorm);
      if (asksOrderType)
        return (
          uNorm.includes("delivery") ||
          uNorm.includes("encomenda") ||
          uNorm.includes("retirada")
        );
      return false;
    });

    if (!wasAnswered || q === recentQuestions[recentQuestions.length - 1]) {
      hints.push(q.content.slice(0, 220));
    }
  }

  if (hints.length === 0) return "";

  const mostRelevant = hints[hints.length - 1];
  let hint = `A mensagem atual ("${msg}") parece resposta de uma pergunta anterior do atendente.\nPergunta anterior: ${mostRelevant}\nResposta atual do cliente: ${msg}`;

  if (hints.length > 1) {
    hint += `\nOutras perguntas recentes do atendente (podem ter contexto relevante):\n${hints
      .slice(0, -1)
      .map((h) => `- ${h.slice(0, 150)}`)
      .join("\n")}`;
  }

  return hint;
}
