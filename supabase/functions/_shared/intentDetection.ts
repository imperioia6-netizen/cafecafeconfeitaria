/**
 * intentDetection.ts — Motor de detecção de intent e estágio da conversa.
 * Classifica a mensagem do cliente em intents (greeting, start_order, ask_price, etc.)
 * e deriva o estágio do fluxo de pedido.
 *
 * SEGURANÇA:
 * - Regex são lineares (sem backtracking exponencial) para evitar ReDoS.
 * - Nenhum eval() ou construção dinâmica de regex a partir de input do usuário.
 */

import type { PromptIntent, PromptStage } from "./atendentePromptModules.ts";
import { normalizeForCompare } from "./webhookUtils.ts";

// ── Tipos re-exportados ──

export type ConversationIntent = PromptIntent;
export type ConversationStage = PromptStage;

// ── Detecção de "novo pedido" (reset) ──

/**
 * Detecta se o cliente quer EXPLICITAMENTE iniciar um novo pedido
 * (e não adicionar itens ao pedido corrente).
 * Usado para limpar memória e evitar arrastar contexto antigo.
 */
export function wantsNewOrder(fullMessage: string): boolean {
  const msg = normalizeForCompare(fullMessage);
  return (
    /\bnov[oa]\s+pedido\b/.test(msg) ||
    /\bpedido\s+nov[oa]\b/.test(msg) ||
    /\bcomecar\s+(?:um\s+)?(?:novo|outro|de\s+novo)\b/.test(msg) ||
    /\bcomeçar\s+(?:um\s+)?(?:novo|outro|de\s+novo)\b/.test(msg) ||
    /\bfazer\s+(?:um\s+)?(?:novo|outro)\s+pedido\b/.test(msg) ||
    /\bquero\s+(?:um\s+)?(?:novo|outro)\s+pedido\b/.test(msg) ||
    /\brecomecar\b/.test(msg) ||
    /\brecomeçar\b/.test(msg) ||
    /\bdo\s+zero\b/.test(msg) ||
    /\boutro\s+pedido\b/.test(msg)
  );
}

// ── Detecção de Intent ──

/**
 * Classifica a mensagem do cliente em um intent de conversa.
 * Ordem de prioridade: greeting > payment_proof > delivery_urgency > start_order > ask_price > ask_recommendation > other
 */
export function detectIntent(fullMessage: string): ConversationIntent {
  const msg = normalizeForCompare(fullMessage);

  // ── Saudações puras ──
  if (
    /^(oi+|ola|bom dia|boa tarde|boa noite|hey|eai|e ai|fala|opa|salve)\s*[!.,?😊🙂👋]*\s*$/i.test(
      msg
    )
  )
    return "greeting";
  if (
    /^(oi+|ola|bom dia|boa tarde|boa noite)[\s,!.]*(tudo\s*(bem|bom|certo|joia|beleza))?\s*[!.,?😊]*\s*$/i.test(
      msg
    )
  )
    return "greeting";

  // ── Comprovante / confirmação de pagamento ──
  if (
    msg.includes("comprovante") ||
    msg.includes("paguei") ||
    msg.includes("ja paguei") ||
    msg.includes("fiz o pix") ||
    msg.includes("transferi") ||
    msg.includes("depositei") ||
    msg.includes("fiz a transferencia") ||
    msg.includes("enviei o pix") ||
    msg.includes("ta pago") ||
    msg.includes("tá pago") ||
    msg.includes("pagamento feito")
  )
    return "payment_proof";
  if (
    msg.includes("pago") &&
    (msg.includes("ja") ||
      msg.includes("já") ||
      msg.includes("ta") ||
      msg.includes("tá") ||
      msg.includes("tudo"))
  )
    return "payment_proof";
  if (
    msg.includes("pix") &&
    (msg.includes("fiz") ||
      msg.includes("enviei") ||
      msg.includes("mandei"))
  )
    return "payment_proof";
  // "pix pronto" / "pix feito" só viram comprovante se a mensagem é bem curta
  // e sem marcadores de dúvida — evita pegar "quando o pix estiver pronto?" etc.
  if (
    msg.includes("pix") &&
    (msg.includes("pronto") || msg.includes("feito")) &&
    msg.length <= 40 &&
    !msg.includes("?") &&
    !msg.includes("quando") &&
    !msg.includes("como") &&
    !msg.includes("depois")
  )
    return "payment_proof";

  // ── Cancelamento / mudança de ideia ──
  if (
    msg.includes("cancela") ||
    msg.includes("desisti") ||
    msg.includes("desistir") ||
    msg.includes("nao quero mais") ||
    msg.includes("não quero mais") ||
    msg.includes("esquece") ||
    msg.includes("deixa pra la") ||
    msg.includes("deixa pra lá") ||
    msg.includes("recomecar") ||
    msg.includes("recomeçar") ||
    msg.includes("começar de novo") ||
    msg.includes("comecar de novo")
  )
    return "other"; // mapped to "cancel" via smartIntentOverride

  // ── Urgência de delivery ──
  if (
    (msg.includes("entregar") || msg.includes("delivery") || msg.includes("entrega")) &&
    (msg.includes("agora") ||
      msg.includes("hoje") ||
      msg.includes("urgente") ||
      msg.includes("rapido") ||
      msg.includes("ja"))
  )
    return "delivery_urgency";
  if (
    (msg.includes("pra agora") ||
      msg.includes("para agora") ||
      msg.includes("pra hoje") ||
      msg.includes("para hoje")) &&
    (msg.includes("pedido") || msg.includes("pedir") || msg.includes("encomenda"))
  )
    return "delivery_urgency";

  // ── Início de pedido ──
  // "me manda/me envia" só é pedido quando NÃO é solicitação de cardápio/tabela.
  const asksCardapioOuTabela =
    msg.includes("cardapio") ||
    msg.includes("cardápio") ||
    msg.includes("tabela") ||
    msg.includes("catalogo") ||
    msg.includes("catálogo") ||
    msg.includes("preco") ||
    msg.includes("preço") ||
    msg.includes("precos") ||
    msg.includes("preços") ||
    msg.includes("valor");
  if (
    msg.includes("quero pedir") ||
    msg.includes("fazer um pedido") ||
    msg.includes("gostaria de pedir") ||
    msg.includes("fazer pedido") ||
    msg.includes("quero fazer") ||
    msg.includes("vou querer") ||
    msg.includes("me vê") ||
    msg.includes("me ve") ||
    ((msg.includes("me manda") || msg.includes("me envia")) && !asksCardapioOuTabela) ||
    msg.includes("preciso de") ||
    msg.includes("precisando de")
  )
    return "start_order";
  if (
    msg.includes("quero") &&
    (msg.includes("bolo") ||
      msg.includes("salgado") ||
      msg.includes("mini") ||
      msg.includes("acai") ||
      msg.includes("açaí") ||
      msg.includes("docinho") ||
      msg.includes("torta") ||
      msg.includes("fatia") ||
      msg.includes("unidade"))
  )
    return "start_order";
  if (/quero\s+(o\s+de|a\s+de|o|um|uma)\s+/i.test(msg)) return "start_order";
  if (
    msg.includes("encomenda") &&
    !msg.includes("preco") &&
    !msg.includes("valor") &&
    !msg.includes("quanto")
  )
    return "start_order";
  if (
    /\d+\s*(kg|mini|unidade|fatia|cento)/.test(msg) &&
    !msg.includes("quanto") &&
    !msg.includes("preco") &&
    !msg.includes("valor")
  )
    return "start_order";

  // ── Respostas de sabor/escolha ──
  if (
    /(?:pode\s+ser|quero|vai\s+ser|faz|seja)\s+(?:de\s+|o\s+de\s+)?/i.test(msg) &&
    msg.includes("bolo")
  )
    return "start_order";
  if (
    /(?:pode\s+ser|vai\s+ser)\s+(?:de\s+|o\s+de\s+)\w/i.test(msg) &&
    !msg.includes("quanto") &&
    !msg.includes("preco") &&
    !msg.includes("valor") &&
    msg.length < 80
  )
    return "start_order";
  if (
    /^(?:o\s+de|de)\s+[a-záàâãéèêíïóôõúüç]/i.test(msg) &&
    msg.length < 50 &&
    !msg.includes("?")
  )
    return "start_order";

  // ── Perguntas de preço ──
  if (
    msg.includes("preco") ||
    msg.includes("valor") ||
    msg.includes("quanto custa") ||
    msg.includes("quanto fica") ||
    msg.includes("quanto e") ||
    msg.includes("quanto sai") ||
    msg.includes("qual o preco") ||
    msg.includes("qual o valor") ||
    msg.includes("quanto ta") ||
    msg.includes("quanto tá") ||
    msg.includes("tabela") ||
    msg.includes("preço")
  )
    return "ask_price";

  // ── Recomendações ──
  if (
    msg.includes("recomenda") ||
    msg.includes("sugere") ||
    msg.includes("qual bolo") ||
    msg.includes("sugestao") ||
    msg.includes("sugestão") ||
    msg.includes("qual outro") ||
    msg.includes("teria outro") ||
    msg.includes("o que voce indica") ||
    msg.includes("o que tem") ||
    msg.includes("quais sabores") ||
    msg.includes("quais os sabores") ||
    msg.includes("que sabores") ||
    msg.includes("cardapio") ||
    msg.includes("cardápio") ||
    msg.includes("catalogo")
  )
    return "ask_recommendation";

  return "other";
}

// ── Derivação de estágio ──

/**
 * Deriva o estágio do fluxo de pedido com base na memória, intent e mensagem.
 * Garante transições seguras entre estágios sem pular etapas.
 */
export function deriveStage(
  memory: Record<string, unknown>,
  intent: ConversationIntent,
  fullMessage: string
): ConversationStage {
  const msg = normalizeForCompare(fullMessage);
  const oldStage = (memory.stage as ConversationStage | undefined) || "start";
  const mentionsOrderType =
    msg.includes("delivery") || msg.includes("retirada") || msg.includes("encomenda");

  // ── Cancelamento → reset ──
  const wantsCancel =
    msg.includes("cancela") ||
    msg.includes("desistir") ||
    msg.includes("desisti") ||
    msg.includes("nao quero mais") ||
    msg.includes("não quero mais") ||
    msg.includes("esquece") ||
    msg.includes("deixa pra la") ||
    msg.includes("deixa pra lá");
  if (wantsCancel && oldStage !== "start") return "start";

  // ── NOVO PEDIDO → reset TOTAL (não complementar o anterior) ──
  const isNewOrder = wantsNewOrder(fullMessage);
  if (isNewOrder) {
    console.log("deriveStage: cliente pediu NOVO pedido → reset para awaiting_order_type");
    return mentionsOrderType ? "collecting_items" : "awaiting_order_type";
  }

  // Pagamento → pós-pagamento
  if (intent === "payment_proof") return "post_payment";

  // Complementando pedido existente (só se NÃO pediu novo)
  if (
    intent === "start_order" &&
    (oldStage === "collecting_items" || oldStage === "awaiting_order_type")
  ) {
    return mentionsOrderType
      ? "collecting_items"
      : oldStage === "collecting_items"
        ? "collecting_items"
        : "awaiting_order_type";
  }

  // Início de pedido novo
  if (intent === "start_order" && !mentionsOrderType) return "awaiting_order_type";
  if (intent === "start_order" && mentionsOrderType) return "collecting_items";

  // Aguardando tipo → tipo informado
  if (oldStage === "awaiting_order_type" && mentionsOrderType) return "collecting_items";

  // Confirmação de pedido
  const hasNegation =
    msg.includes("isso nao") ||
    msg.includes("isso não") ||
    msg.includes("isso errado") ||
    msg.includes("isso ta errado") ||
    msg.includes("não é isso");
  const confirmsOrder =
    !hasNegation &&
    (msg.includes("isso") ||
      msg.includes("correto") ||
      msg.includes("confirmo") ||
      msg.includes("ta certo") ||
      msg.includes("está certo") ||
      msg.includes("isso mesmo") ||
      msg.includes("isso ai") ||
      msg.includes("pode confirmar"));
  if (oldStage === "collecting_items" && confirmsOrder) return "confirming_order";

  // Pagamento
  if (
    oldStage === "confirming_order" &&
    (msg.includes("pix") || msg.includes("pagar") || msg.includes("pagamento"))
  )
    return "awaiting_payment";

  // Manter estágios estáveis
  if (oldStage === "awaiting_payment" && intent !== "start_order") return "awaiting_payment";
  if (oldStage === "confirming_order" && intent === "other") return "confirming_order";

  // Preço/recomendação durante qualquer etapa
  if (intent === "ask_price" || intent === "ask_recommendation") {
    return oldStage === "start" ? "collecting_items" : oldStage;
  }

  return oldStage;
}

// ── Hints de controle ──

/**
 * Gera hint de controle de fluxo para o LLM com regras de comportamento.
 */
export function buildControlHint(
  intent: ConversationIntent,
  stage: ConversationStage,
  memory: Record<string, unknown>,
  currentMessage?: string
): string {
  const lastIntent = (memory.last_intent as string | undefined) || "none";
  const currentTopic = (memory.current_topic as string | undefined) || "desconhecido";

  // Detectar tópico atual baseado na mensagem
  let detectedTopic = currentTopic;
  if (currentMessage) {
    const msg = currentMessage.toLowerCase();
    if (/\b(salgad|coxinha|kibe|quibe|risole|bolinha|empada|esfiha)\b/i.test(msg)) {
      detectedTopic = "salgados";
    } else if (/\b(bolo|torta|fatia|massa)\b/i.test(msg)) {
      detectedTopic = "bolo";
    } else if (/\b(doce|docinho|brigadeiro|beijinho)\b/i.test(msg)) {
      detectedTopic = "doces";
    } else if (/\b(acai|açaí)\b/i.test(msg)) {
      detectedTopic = "acai";
    }
  }

  return `[MOTOR_DE_CONTROLE_DE_FLUXO]
- intent_atual: ${intent}
- etapa_atual: ${stage}
- intent_anterior: ${lastIntent}
- topico_atual: ${detectedTopic}
- regras_chave:
  1) nao inventar produto fora do cardapio — se não tem, diga "vou verificar com a equipe"
  2) MEMÓRIA CONTÍNUA: NUNCA re-perguntar info ja fornecida. Se o cliente disse "encomenda", "delivery" ou "retirada" em QUALQUER momento anterior, GUARDE e NÃO pergunte de novo.
  3) se etapa_atual=awaiting_order_type, perguntar objetivamente: "É para encomenda, delivery ou retirada?"
  4) se etapa_atual=collecting_items, coletar itens e so depois fechar total. Ao fechar, LISTAR TODOS os itens com preço individual.
  5) resposta curta, humana, direta e com pausa natural
  6) se o cliente informa sabor e peso ja foi dito → combinar e calcular, sem perguntar peso de novo
  7) se o cliente informa peso e sabor ja foi dito → combinar e calcular, sem perguntar sabor de novo
  8) TÓPICO ATUAL=${detectedTopic}: se o cliente está falando de ${detectedTopic}, responda SOBRE ${detectedTopic}. NÃO mude de assunto. NÃO confunda salgados com bolos.
  9) depois de responder/adicionar item, pergunte "Deseja mais alguma coisa?" ou "Quer adicionar algo mais?"
  10) NUNCA comece a mensagem com "Oi" ou "Oi! 😊" (exceto na primeiríssima saudação)
  11) kg INTEIRO: só 1, 2, 3 ou 4kg. Se pedir quebrado, pergunte se quer arredondar.
  12) NUNCA ESQUEÇA ITENS: ao fazer o resumo do pedido, TODOS os itens mencionados pelo cliente devem estar listados. Verifique um por um.
  13) Se o cliente ALTERAR o pedido (mudar peso, adicionar/remover item), RECALCULE o total completo.
  14) Se for DELIVERY: pergunte o ENDEREÇO antes de fechar.
  15) Mini salgados: cada SABOR deve ser múltiplo de 25. Se não for, RECUSE.
  16) Salgados AVULSOS (tamanho normal) SÃO vendidos. Mini salgados são SÓ por encomenda.
  17) Decoração: SIM fazemos (+R$30). NÃO fazemos papel de arroz.
  18) Entrega de encomendas: SIM fazemos delivery de encomendas.
  19) Horários: Loja 07:30-19:30. Delivery a partir das 09:00.
[/MOTOR_DE_CONTROLE_DE_FLUXO]`;
}

/**
 * Garante que a resposta pergunta o tipo de pedido quando necessário.
 */
export function enforceOrderTypeQuestion(
  replyText: string,
  intent: ConversationIntent,
  stage: ConversationStage,
  fullMessage: string
): string {
  if (!replyText) return replyText;
  const msg = normalizeForCompare(fullMessage);
  const hasOrderTypeInUserMsg =
    msg.includes("delivery") || msg.includes("retirada") || msg.includes("encomenda");
  if (intent !== "start_order" || hasOrderTypeInUserMsg || stage !== "awaiting_order_type")
    return replyText;
  const rep = normalizeForCompare(replyText);
  if (rep.includes("encomenda") && rep.includes("delivery") && rep.includes("retirada"))
    return replyText;
  if (rep.includes("retirada") || rep.includes("delivery") || rep.includes("encomenda"))
    return replyText;
  return `${replyText.trim()}\n\nMe diz: é retirada, delivery ou encomenda? 😊`;
}
