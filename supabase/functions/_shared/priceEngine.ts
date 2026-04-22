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

/** Palavras que indicam DECORAÇÃO (visual do bolo). NUNCA são sabor. */
const DECORATION_KEYWORDS = [
  "decoracao",
  "decorar",
  "decorado",
  "decorada",
  "decorativ",
  "topo",
  "chantininho",
  "chantilly",
  "pasta americana",
  "papel de arroz",
  "colorid",
  "florid",
  "flor",
  "flore",
  "bolinha",
  "confeito",
  "granulad",
  "personalizad",
  "tematic",
  "tema ",
  "escrita",
  "homem aranha",
  "princesa",
  "patrulha canina",
  "frozen",
  "minnie",
  "mickey",
  "super heroi",
];

/** True se a mensagem parece estar descrevendo decoração do bolo. */
export function messageMentionsDecoration(fullMessage: string): boolean {
  const norm = normalizeForCompare(fullMessage);
  return DECORATION_KEYWORDS.some((kw) => norm.includes(kw));
}

/**
 * True se a mensagem é predominantemente sobre HORÁRIO / DATA / DIA.
 * Importante porque frases como "pode ser as 9 de amanhã" ou "marcamos pra
 * segunda às 10" NÃO devem ser interpretadas como sabor / item do cardápio.
 * Tolera typos comuns ("amanhaas", "amanh", "13hrs").
 */
export function messageIsAboutTime(fullMessage: string): boolean {
  const norm = normalizeForCompare(fullMessage);
  if (!norm) return false;
  // Numérico: "9h", "10:30", "9 horas", "às 9", "as 9", "13hrs".
  if (/\b\d{1,2}\s*(?:h|hs|hrs|horas?|hr)\b/i.test(norm)) return true;
  if (/\b\d{1,2}\s*:\s*\d{2}\b/.test(norm)) return true;
  if (/\b(?:as|às|a)\s+\d{1,2}\b/.test(norm)) return true;
  // Prefixo "amanh" cobre "amanhã", "amanha", "amanhaas" (typo), "amanh".
  if (/\bamanh\w*/i.test(norm)) return true;
  // Prefixo "hoj" cobre "hoje", "hj".
  if (/\bhoje?\b|\bhj\b/i.test(norm)) return true;
  // Palavras-chave de tempo/dia
  const TIME_WORDS = [
    "horario",
    "horário",
    "hora",
    "horas",
    "amanha",
    "amanhã",
    "hoje",
    "depois de amanha",
    "manha",
    "manhã",
    "tarde",
    "noite",
    "cedo",
    "segunda",
    "terca",
    "terça",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
    "sábado",
    "domingo",
    "fim de semana",
    "final de semana",
    "dia ",
    "feriado",
    "marcamos",
    "marcar",
    "agendar",
    "agendamento",
  ];
  const hasTimeWord = TIME_WORDS.some((kw) => norm.includes(kw));
  // "pode ser" + número ou dia/hora (padrão de confirmação de horário)
  if (/\bpode\s+ser\s+.*(?:\d|amanh|hoje|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo|manha|manhã|tarde|noite|hora)/i.test(
    norm
  )) {
    return true;
  }
  return hasTimeWord;
}

// ── Guardrail: saudação do cliente NÃO reativa pedido antigo ──

/**
 * Se o cliente mandou uma SAUDAÇÃO nova ("oi", "olá", "bom dia") e a resposta
 * do LLM veio com resumo de pedido antigo / preços / "desculpa a confusão" /
 * recálculo, substituímos por um cumprimento simples. Evita o caso do LLM
 * puxar memória antiga e alucinar uma continuação errada.
 *
 * Condições para disparar (ALL):
 *   1) mensagem atual é saudação isolada (curta, só "oi"/"olá"/"bom dia" etc.)
 *   2) resposta gerada tem > 60 chars E indica continuação de pedido
 *      (lista itens, total, pix, "desculpa a confusão", "seu pedido", etc.)
 */
export function enforceGreetingReset(
  replyText: string,
  currentMessage: string,
  history: { role: "user" | "assistant"; content: string }[]
): string {
  if (!replyText) return replyText;
  const msg = (currentMessage || "").trim();
  if (!msg) return replyText;
  const msgNorm = normalizeForCompare(msg);
  // Saudação "pura" (curta, só cumprimento).
  const GREETING_RE =
    /^(?:oi+|ola|ola[\s!.,]|ol[áa]|ei+|hey+|bom\s*dia|boa\s*tarde|boa\s*noite|oi\s*tudo\s*bem|opa|salve|e\s*ai|eai)[\s!.,?\u{1F44B}\u{1F60A}\u{1F642}\u{1F44C}]*$/iu;
  if (!GREETING_RE.test(msgNorm)) return replyText;

  const replyNorm = normalizeForCompare(replyText);
  const looksLikePedidoRetomada =
    replyNorm.includes("desculpa a confusao") ||
    replyNorm.includes("pedido atualizado") ||
    replyNorm.includes("seu pedido") ||
    replyNorm.includes("resumo do pedido") ||
    replyNorm.includes("resumo do seu pedido") ||
    replyNorm.includes("pedimos 50") ||
    replyNorm.includes("chave pix") ||
    /\btotal\s*[:r$]/.test(replyNorm) ||
    (replyNorm.match(/r\$\s*\d/g) || []).length >= 2 ||
    /pix\s+no\s+banco/.test(replyNorm);
  if (!looksLikePedidoRetomada) return replyText;
  if (replyText.trim().length <= 60) return replyText;

  // Tem pedido ABERTO confirmado na sessão? (se tiver, avisa; senão só saúda).
  // Como não temos acesso à sessão aqui, cumprimentamos e perguntamos.
  const hasPrevAssistant = history.some((h) => h.role === "assistant");
  const greet = hasPrevAssistant
    ? "Oi de novo! 😊 Como posso te ajudar?"
    : "Oi! 😊 Bem-vindo à Café Café Confeitaria. Como posso te ajudar?";
  return greet;
}

// ── Guardrail: bloquear preços absurdos / inventados ──

/**
 * Detecta valores monetários malformados ou absurdos na resposta do LLM.
 * Exemplos reais capturados em produção:
 *   - "R$15,008,00" (duas vírgulas — formato impossível em BRL)
 *   - "R$15.008,00" para um bolo trufado 2kg (valor esperado ~R$258)
 *
 * Quando detecta, retorna string de aviso para o cliente e flag true para
 * o pipeline substituir a resposta. Caso contrário retorna null.
 *
 * @param replyText resposta do LLM
 * @param maxItemValue valor máximo plausível para um ITEM isolado (default 4000)
 */
export function detectInsanePrices(
  replyText: string,
  maxItemValue: number = 4000
): { hasInsane: boolean; offenders: string[] } {
  if (!replyText) return { hasInsane: false, offenders: [] };
  const offenders: string[] = [];

  // 1) Formato claramente inválido: duas vírgulas ou dois pontos no mesmo
  //    número BRL (ex.: "15,008,00" / "15.008.00" / "1.234.567,89,0").
  const badFormat = replyText.match(
    /R\$\s*\d{1,3}(?:[.,]\d{1,3}){2,}(?:[.,]\d+)?/g
  );
  if (badFormat) {
    for (const b of badFormat) {
      // Exceção: formato válido "R$1.234,56" (um ponto de milhar + vírgula decimal)
      // só tem UM separador de milhar antes da vírgula, com 3 dígitos exatos.
      const m = b.match(/R\$\s*(\d{1,3}(?:\.\d{3})+),\d{2}$/);
      if (!m) offenders.push(b.trim());
    }
  }

  // 2) Valores absurdamente altos para item único (>R$ maxItemValue).
  //    Parser tolerante: aceita "1.234,56" e "1234,56" e "1234.56".
  const moneyRegex = /R\$\s*([\d.,]+)/g;
  let match: RegExpExecArray | null;
  while ((match = moneyRegex.exec(replyText)) !== null) {
    const raw = match[1];
    // Remove tudo menos dígitos, pontos e vírgulas.
    let norm = raw.replace(/[^\d.,]/g, "");
    // Se tem vírgula, ela é o separador decimal (BR). Pontos são milhares.
    if (norm.includes(",")) {
      norm = norm.replace(/\./g, "").replace(",", ".");
    } else if ((norm.match(/\./g) || []).length > 1) {
      // Vários pontos e sem vírgula → milhares (ex.: 1.234.567)
      norm = norm.replace(/\./g, "");
    }
    const n = Number(norm);
    if (Number.isFinite(n) && n >= maxItemValue * 2) {
      offenders.push(`R$ ${raw} (~R$${n.toFixed(0)})`);
    }
  }

  return { hasInsane: offenders.length > 0, offenders };
}

/**
 * Substitui a resposta por um aviso quando o LLM produz preços absurdos.
 */
export function enforceSanePrices(replyText: string): string {
  if (!replyText) return replyText;
  const { hasInsane, offenders } = detectInsanePrices(replyText);
  if (!hasInsane) return replyText;
  console.warn(
    "enforceSanePrices: preço(s) suspeito(s) detectado(s):",
    offenders
  );
  return "Opa, deixa eu conferir os valores direitinho antes de fechar — um segundinho 😊";
}

// ── Guardrail: não repetir a mesma resposta do atendente ──

/**
 * Normaliza texto para comparação de similaridade (lowercase, sem acentos,
 * sem pontuação e colapsando espaços). Usado só internamente.
 */
function collapseForSimilarity(text: string): string {
  return normalizeForCompare(text)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Se a resposta gerada é virtualmente idêntica à última mensagem do
 * atendente, substitui por uma continuação adequada ao contexto. Evita
 * casos como o LLM reenviar a mesma mensagem de "desculpa a confusão"
 * duas vezes seguidas.
 *
 * Limiar: similaridade de prefixo + overlap de tokens > 80%.
 */
export function enforceNoExactRepeat(
  replyText: string,
  history: { role: "user" | "assistant"; content: string }[]
): string {
  if (!replyText) return replyText;
  const lastAssistant = [...history].reverse().find((h) => h.role === "assistant");
  if (!lastAssistant?.content) return replyText;

  const a = collapseForSimilarity(replyText);
  const b = collapseForSimilarity(lastAssistant.content);
  if (!a || !b) return replyText;
  // Respostas curtas ("ok", "obrigado") podem repetir legitimamente — ignoramos.
  if (a.length <= 40) return replyText;
  if (a === b) {
    return "Tudo certo! Vou prosseguir com o seu pedido 😊";
  }
  // Prefixo: quantos chars iniciais iguais?
  let commonPrefix = 0;
  const maxPrefix = Math.min(a.length, b.length);
  while (commonPrefix < maxPrefix && a[commonPrefix] === b[commonPrefix]) {
    commonPrefix++;
  }
  const prefixRatio = commonPrefix / Math.max(a.length, b.length);

  // Jaccard dos tokens.
  const tokensA = new Set(a.split(" ").filter(Boolean));
  const tokensB = new Set(b.split(" ").filter(Boolean));
  let inter = 0;
  for (const t of tokensA) if (tokensB.has(t)) inter++;
  const union = tokensA.size + tokensB.size - inter;
  const jaccard = union === 0 ? 0 : inter / union;

  // Considera repetição se prefixo longo (>70%) OU jaccard alto (>85%) E
  // o texto tem tamanho razoável (>40 chars, evita falso positivo em "ok").
  const isRepeat =
    a.length > 40 && (prefixRatio > 0.7 || jaccard > 0.85);
  if (!isRepeat) return replyText;
  console.warn(
    "enforceNoExactRepeat: resposta muito similar à anterior do atendente — substituindo"
  );
  return "Tudo certo! Vou prosseguir com o seu pedido 😊";
}

// ── Guardrail: não rejeitar fragmento funcional como "sabor inexistente" ──

/**
 * Indica se a mensagem do cliente é um pedido de ESCRITA no bolo — ou seja,
 * a frase que vem junto (ex.: "amo voce", "feliz aniversário") é o TEXTO
 * da escrita, não sabor. Reconhece padrões como "quero escrita em cima do
 * bolo X" / "escrever X no bolo" / "com a frase X" / "com os dizeres X".
 */
export function messageIsAboutWriting(fullMessage: string): boolean {
  const norm = normalizeForCompare(fullMessage);
  if (!norm) return false;
  const patterns = [
    /\bescrita\b/,
    /\bescrever\b/,
    /\bescrev\w*\b/,
    /\btexto\s+(?:no|em\s+cima\s+do|do|para\s+o)\s+bolo\b/,
    /\bmensagem\s+(?:no|em\s+cima\s+do|do|para\s+o)\s+bolo\b/,
    /\bcom\s+a\s+frase\b/,
    /\bcom\s+os?\s+dizer\w*\b/,
    /\b(?:dizer|dizendo|escrito)\s+(?:no\s+)?bolo\b/,
    /\bem\s+cima\s+do\s+bolo\b/,
  ];
  return patterns.some((re) => re.test(norm));
}

/**
 * Se a resposta diz "o sabor 'X' não temos" (ou equivalente) onde X é
 * implausível como sabor — fragmento funcional, fragmento temporal, frase
 * de escrita, ou simplesmente algo que NÃO existe nem parcialmente no
 * cardápio real — reescrevemos a resposta para uma pergunta aberta.
 *
 * Parâmetros opcionais (para validação contextual):
 *   - currentMessage: mensagem original do cliente (para detectar contexto de
 *     ESCRITA / "em cima do bolo").
 *   - recipeNames: nomes do cardápio; se X não bate com nenhum, rejeita.
 */
export function enforceNoFragmentAsFlavor(
  replyText: string,
  currentMessage?: string,
  recipeNames?: string[]
): string {
  if (!replyText) return replyText;

  // Captura padrões "sabor X não temos", "sabor 'X' não existe", "Bolo de X não temos", etc.
  // Aceita aspas retas (" '), curly (“ ” ‘ ’), francesas («»), crase e *asteriscos*.
  const patterns: RegExp[] = [
    /(?:o\s+)?sabor\s*["'\u201C\u201D\u2018\u2019\u00AB\u00BB\u0060*]?([^"'\u201C\u201D\u2018\u2019\u00AB\u00BB\u0060*\n.!?]{1,60}?)["'\u201C\u201D\u2018\u2019\u00AB\u00BB\u0060*]?\s+(?:a\s+gente\s+)?n[a\u00E3]o\s+(?:temos|tem|existe|consta)/i,
    /bolo\s+(?:s[o\u00F3]\s+)?de\s*["'\u201C\u201D\u2018\u2019\u00AB\u00BB\u0060*]?([^"'\u201C\u201D\u2018\u2019\u00AB\u00BB\u0060*\n.!?]{1,60}?)["'\u201C\u201D\u2018\u2019\u00AB\u00BB\u0060*]?\s+(?:a\s+gente\s+)?n[a\u00E3]o\s+(?:temos|tem|existe|consta)/i,
    /(?:esse|esta?)\s+sabor\s*["'\u201C\u201D\u2018\u2019\u00AB\u00BB\u0060*]?([^"'\u201C\u201D\u2018\u2019\u00AB\u00BB\u0060*\n.!?]{1,60}?)["'\u201C\u201D\u2018\u2019\u00AB\u00BB\u0060*]?\s+n[a\u00E3]o/i,
  ];

  // Palavras funcionais que NÃO podem ser sabor (prep/verbo/conector/tempo).
  const FUNCTIONAL = new Set([
    "ser",
    "eh",
    "é",
    "e",
    "as",
    "às",
    "a",
    "o",
    "os",
    "de",
    "da",
    "do",
    "das",
    "dos",
    "para",
    "pra",
    "pro",
    "com",
    "sem",
    "por",
    "em",
    "no",
    "na",
    "nos",
    "nas",
    "ate",
    "até",
    "sim",
    "nao",
    "não",
    "ok",
    "agora",
    "hoje",
    "amanha",
    "amanhã",
    "manha",
    "manhã",
    "tarde",
    "noite",
    "hora",
    "horas",
    "horario",
    "horário",
    "segunda",
    "terca",
    "terça",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
    "sábado",
    "domingo",
    "quero",
    "pode",
    "vai",
    "que",
    "qual",
    "quanto",
    "quando",
  ]);

  // Tokens que, mesmo com typo ou sufixo, indicam função/tempo (não sabor).
  const FUNCTIONAL_PREFIXES = [
    "amanh", // amanhã, amanha, amanhaas (typo), amanhã
    "segund", // segunda-feira
    "terc", "terç",
    "quart",
    "quint",
    "sext",
    "sabad", "sábad",
    "doming",
    "horari", "horári",
    "manh",
    "noit",
    "hoj",
  ];

  const isFragmentFunctional = (raw: string): boolean => {
    const cleaned = raw
      .toLowerCase()
      .replace(/[^a-zà-ú0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return false;
    const tokens = cleaned.split(" ").filter(Boolean);
    if (tokens.length === 0) return false;
    // Se qualquer token contém dígito (ex.: "9"), é fragmento temporal.
    if (tokens.some((t) => /\d/.test(t))) return true;
    // Conta funcional se: nome exato na lista OU começa com prefixo temporal.
    const isFunc = (t: string): boolean =>
      FUNCTIONAL.has(t) || FUNCTIONAL_PREFIXES.some((p) => t.startsWith(p));
    const functionalHits = tokens.filter(isFunc).length;
    // Se TODOS são funcionais, ou se maioria é funcional e string é curta.
    if (functionalHits === tokens.length) return true;
    if (tokens.length <= 3 && functionalHits >= 1) return true;
    return false;
  };

  // Verdadeiro se "X" NÃO bate nem parcialmente com qualquer nome do cardápio.
  const notInMenu = (raw: string): boolean => {
    if (!recipeNames || recipeNames.length === 0) return false;
    const n = normalizeForCompare(raw);
    if (!n) return false;
    // Bate se qualquer nome do cardápio contém ou está contido em X.
    const hit = recipeNames.some((name) => {
      const rn = normalizeForCompare(name);
      if (!rn) return false;
      return n.includes(rn) || rn.includes(n);
    });
    return !hit;
  };

  const writingContext = currentMessage
    ? messageIsAboutWriting(currentMessage)
    : false;

  for (const re of patterns) {
    const m = replyText.match(re);
    if (!m || !m[1]) continue;
    const x = m[1].trim();
    const shouldRewrite =
      isFragmentFunctional(x) ||
      writingContext ||
      notInMenu(x);
    if (shouldRewrite) {
      if (writingContext) {
        return "Opa, acho que me confundi aqui 😅 — parece que o texto é o que você quer ESCRITO no bolo (escrita personalizada). Pra eu anotar certinho: qual o SABOR do bolo e qual a FRASE que vai escrita?";
      }
      return "Opa, acho que entendi errado aqui 😅 — me confirma qual o sabor do bolo que você quer? (Trabalhamos com vários sabores no cardápio — posso te passar a lista se precisar.)";
    }
  }
  return replyText;
}

/**
 * Extrai pedido de decoração da mensagem do cliente.
 */
export function extractDecorationRequestFromMessage(
  fullMessage: string
): string | null {
  const text = (fullMessage || "").trim();
  if (!text) return null;
  if (!messageMentionsDecoration(text)) return null;
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

// ── Guardrail: remover "escrita personalizada" fantasma do resumo ──

/**
 * Se a resposta menciona "escrita" ou "+R$15" mas NEM a mensagem atual NEM o
 * histórico do cliente pediram escrita/texto no bolo, removemos as linhas que
 * cobram a taxa. Isso impede o LLM de alucinar R$15 a mais num pedido.
 *
 * Não mexe em nada se o cliente realmente pediu escrita.
 */
export function enforcePhantomWritingRemoval(
  replyText: string,
  currentMessage: string,
  history: { role: "user" | "assistant"; content: string }[]
): string {
  if (!replyText) return replyText;

  // 1. Cliente pediu escrita em ALGUM momento?
  const WRITING_RE =
    /\b(escrita|escrever|texto\s+no\s+bolo|mensagem\s+no\s+bolo|parab[eé]ns|feliz\s+anivers|eu\s+te\s+amo|com\s+a?\s*frase|com\s+os?\s+dizer|escrevinho|mensagenzinha)\b/i;
  const clientTexts = [
    currentMessage,
    ...history.filter((h) => h.role === "user").map((h) => h.content || ""),
  ].join("\n");
  if (WRITING_RE.test(clientTexts)) return replyText;

  // 2. A resposta menciona escrita ou +R$15?
  const replyHasWritingItem =
    /\b(escrita|escrever)\s+personaliz/i.test(replyText) ||
    /\+\s*R\$\s*15/i.test(replyText);
  if (!replyHasWritingItem) return replyText;

  // 3. Remover linhas/bullets que cobram escrita.
  const lines = replyText.split(/\r?\n/);
  const kept = lines.filter((l) => {
    const norm = normalizeForCompare(l);
    const isWritingLine =
      /\b(escrita|escrever)\b/i.test(l) ||
      (/\+\s*R\$\s*15/i.test(l) && !/taxa|entrega|delivery/i.test(norm));
    return !isWritingLine;
  });
  // Também limpar menções inline "+R$15,00 (escrita)".
  let cleaned = kept.join("\n");
  cleaned = cleaned.replace(
    /\s*\+\s*R\$\s*15(?:[.,]\d+)?\s*(?:\([^)]*escrita[^)]*\))?/gi,
    ""
  );
  cleaned = cleaned.replace(/\s*\(escrita[^)]*\)/gi, "");
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

// ── Guardrail: após Pix + OK do cliente, NÃO repete resumo ──

/**
 * Caso típico: o atendente já mandou o PIX e pediu o comprovante. O cliente
 * responde "ok", "vou fazer", "tudo certo", "blz". Nesse momento, a resposta
 * correta é curta — só aguardar o comprovante — e NÃO repetir o resumo do
 * pedido com itens, total, etc.
 *
 * Este guardrail detecta esse cenário e substitui uma resposta que "refaria
 * o resumo" por uma confirmação simples.
 */
export function enforceNoRepeatAfterPix(
  replyText: string,
  currentMessage: string,
  history: { role: "user" | "assistant"; content: string }[]
): string {
  if (!replyText) return replyText;

  // 1. A última mensagem do atendente já trazia PIX / chave / sinal /
  //    instrução de comprovante?
  const lastAssistant = [...history].reverse().find((h) => h.role === "assistant");
  if (!lastAssistant || !lastAssistant.content) return replyText;
  const lastNorm = normalizeForCompare(lastAssistant.content);
  const hadPix =
    /\bpix\b/.test(lastNorm) ||
    lastNorm.includes("chave pix") ||
    lastNorm.includes("comprovante") ||
    /\b50\s*%/.test(lastNorm) ||
    lastNorm.includes("sinal de 50") ||
    lastNorm.includes("sinal do pedido") ||
    lastNorm.includes("valor do sinal");
  if (!hadPix) return replyText;

  // 2. Cliente respondeu com confirmação curta/positiva?
  const msg = (currentMessage || "").trim();
  if (!msg || msg.length > 80) return replyText;
  const msgNorm = normalizeForCompare(msg);
  const SHORT_AFFIRM = new RegExp(
    "^(?:" +
      [
        "ok",
        "okay",
        "okey",
        "ta\\s*bom",
        "esta\\s*bom",
        "tudo\\s*bem",
        "tudo\\s*certo",
        "ta\\s*certo",
        "blz",
        "beleza",
        "vou\\s*fazer",
        "vou\\s*pagar",
        "vou\\s*mandar",
        "vou\\s*enviar",
        "ja\\s*vou",
        "agora\\s*mesmo",
        "agora\\s*vou",
        "pode\\s*deixar",
        "pode\\s*ser",
        "pode\\s*deixa",
        "certo",
        "perfeito",
        "fechou",
        "fechado",
        "combinado",
        "combinadissimo",
        "valeu",
        "obrigad[ao]?",
        "show",
        "top",
        "demais",
        "otimo",
        "e\\s*isso",
        "eh\\s*isso",
        "isso\\s*mesmo",
        "isso\\s*ai",
        "\u{1F44D}+",
        "\u{1F44C}+",
      ].join("|") +
      ")[\\s.,!?\u{1F44D}\u{1F44C}\u{1F60A}]*$",
    "iu"
  );
  const clientConfirms = SHORT_AFFIRM.test(msgNorm);
  if (!clientConfirms) return replyText;

  // 3. Depois de mandar o PIX e receber uma confirmação curta, a resposta
  //    correta é MUITO curta. QUALQUER resposta longa (>80 chars) é anormal
  //    e será substituída. Também cobre especificamente: repetição de resumo,
  //    re-envio de itens/preços, desculpas repetidas, listagem de pedido.
  const replyNorm = normalizeForCompare(replyText);
  const replyCleanLen = replyText.trim().length;

  const obviousRepeat =
    replyNorm.includes("resumo do pedido") ||
    replyNorm.includes("resumo do seu pedido") ||
    replyNorm.includes("seu pedido atualizado") ||
    replyNorm.includes("seu pedido completo") ||
    replyNorm.includes("vamos fechar") ||
    replyNorm.includes("vamos finalizar") ||
    /\btotal\s*[:r$]/.test(replyNorm) ||
    /\bitens\b[\s\S]{0,120}\btotal\b/.test(replyNorm) ||
    (replyNorm.match(/r\$\s*\d/g) || []).length >= 2 ||
    replyNorm.includes("desculpa a confusao") ||
    replyNorm.includes("pedimos 50") ||
    replyNorm.includes("chave pix") ||
    /pix\s+no\s+banco/.test(replyNorm);

  // Depois de PIX + confirmação curta do cliente, a resposta ideal tem menos
  // de ~80 chars. Acima disso, substituímos a não ser que seja uma resposta
  // de aguardar comprovante legítima (curta por natureza).
  const tooLongForAffirmation = replyCleanLen > 80;

  if (!obviousRepeat && !tooLongForAffirmation) return replyText;

  // 4. Substituir por confirmação curta aguardando o comprovante.
  return "Beleza! Fico no aguardo do seu comprovante 😊";
}

// ── Guardrail: encomenda → sempre perguntar entrega OU retirada ──

/**
 * Em toda ENCOMENDA, precisamos que o cliente escolha entre ENTREGA (delivery)
 * e RETIRADA na loja. Este guardrail impede o agente de pular direto para
 * endereço/CEP quando o cliente ainda não escolheu.
 *
 * Exceção: se o pedido tem bolo de 4kg, é automaticamente RETIRADA — não
 * perguntamos nem pedimos endereço. Nesse caso removemos qualquer tentativa
 * de pedir endereço/CEP e lembramos a regra.
 *
 * Quando o cliente já disse "retirada" ou "entrega/delivery" (na msg atual ou
 * no histórico), passa intacto — o agente pode prosseguir.
 */
export function enforceEncomendaDeliveryQuestion(
  replyText: string,
  currentMessage: string,
  history: { role: "user" | "assistant"; content: string }[]
): string {
  if (!replyText) return replyText;

  const userText = normalizeForCompare(
    [currentMessage, ...history.filter((h) => h.role === "user").map((h) => h.content || "")].join(" ")
  );
  const allText = normalizeForCompare(
    [currentMessage, ...history.map((h) => h.content || "")].join(" ")
  );

  // 1. É um fluxo de ENCOMENDA?
  const isEncomenda = /\bencomenda\w*\b/.test(allText);
  if (!isEncomenda) return replyText;

  // 2. Cliente já escolheu entrega ou retirada?
  const CHOICE_RE =
    /\b(retirada|retirar|retiro|retirarei|busco|buscar|pego\s+na\s+loja|pegar\s+na\s+loja|passo\s+ai|vou\s+ai|entrega|delivery|entregar|entregue|entreguem|entregam)\b/;
  const chose = CHOICE_RE.test(userText);

  // 3. Tem bolo de 4kg? (regra de negócio: 4kg é só retirada)
  const has4kg = /\b4\s*kg\b/.test(allText);

  if (chose && !has4kg) return replyText;

  // 4. Resposta pede endereço / CEP / assume entrega?
  const ADDRESS_RE =
    /\b(endere[cç]o|cep\b|rua\s+\w|bairro\s+[a-z]|preciso\s+do\s+seu\s+endere|me\s+manda\s+(?:o\s+)?endere|qual\s+(?:o\s+)?(?:seu\s+)?endere)/i;
  const asksAddress = ADDRESS_RE.test(replyText);

  if (has4kg && !asksAddress) return replyText; // 4kg, sem pergunta de endereço — ok

  if (has4kg && asksAddress) {
    // 4kg só pode ser retirada — remover pergunta de endereço e forçar retirada.
    const lines = replyText.split(/\r?\n/);
    const kept = lines.filter((l) => !ADDRESS_RE.test(l));
    const base = kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
    return `${base}\n\nComo tem bolo de 4kg, a encomenda é somente para RETIRADA na loja 😊`;
  }

  // 5. Encomenda sem 4kg e cliente ainda não escolheu → substitui pergunta de
  //    endereço pela pergunta de entrega/retirada.
  if (!asksAddress && !chose) {
    // Se a resposta não pede endereço mas também não pergunta tipo, adicionamos a pergunta.
    const replyNorm = normalizeForCompare(replyText);
    const alreadyAsking =
      replyNorm.includes("entrega ou retirada") ||
      replyNorm.includes("retirada ou entrega") ||
      (replyNorm.includes("vai ser") &&
        (replyNorm.includes("retirada") || replyNorm.includes("entrega")));
    if (alreadyAsking) return replyText;
    // Anexa a pergunta só se a resposta parece estar fechando/continuando o pedido
    // (contém total/finalizar/resumo).
    const isFinalizing =
      /\btotal\b/i.test(replyText) ||
      /finaliz/i.test(replyText) ||
      /resumo/i.test(replyText) ||
      /pedido/i.test(replyText);
    if (!isFinalizing) return replyText;
    return `${replyText.trimEnd()}\n\nAh, sua encomenda vai ser com entrega ou retirada na loja? 😊`;
  }

  if (!chose && asksAddress) {
    // Remover linhas sobre endereço/CEP e substituir pela pergunta certa.
    const lines = replyText.split(/\r?\n/);
    const kept = lines.filter((l) => !ADDRESS_RE.test(l));
    const base = kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
    return `${base}\n\nAntes de fechar: sua encomenda vai ser com entrega ou retirada na loja? 😊`;
  }

  return replyText;
}

// ── Guardrail: sempre perguntar "mais alguma coisa?" antes de fechar ──

/**
 * Se a resposta tem indicador de FECHAMENTO (total, resumo, "anotado"+item,
 * "vamos fechar") mas NÃO contém a pergunta "mais alguma coisa?" e o cliente
 * AINDA não disse "só isso / pode fechar", anexa a pergunta ao final.
 *
 * Este guardrail é intencionalmente conservador: não altera a resposta,
 * apenas acrescenta uma linha garantindo que a etapa de confirmação
 * aconteça antes de qualquer fechamento.
 */
export function enforceAskMoreBeforeClosure(
  replyText: string,
  currentMessage: string,
  history: { role: "user" | "assistant"; content: string }[]
): string {
  if (!replyText) return replyText;

  const replyNorm = normalizeForCompare(replyText);
  const currentNorm = normalizeForCompare(currentMessage);

  // Cliente já pediu pra fechar?
  const doneMarkers = [
    "so isso",
    "só isso",
    "é isso",
    "e isso",
    "nada mais",
    "nao quero mais",
    "não quero mais",
    "pode fechar",
    "pode finalizar",
    "finaliza",
    "finalizar",
    "bora pagar",
    "quero pagar",
    "fechou",
  ];
  const hitDone = (t: string) => doneMarkers.some((m) => t.includes(m));
  const recentUserText = history
    .filter((h) => h.role === "user")
    .slice(-3)
    .map((h) => normalizeForCompare(h.content))
    .join(" ");
  if (hitDone(currentNorm) || hitDone(recentUserText)) return replyText;

  // A resposta já pergunta?
  const alreadyAsks =
    replyNorm.includes("mais alguma coisa") ||
    replyNorm.includes("podemos finalizar") ||
    replyNorm.includes("podemos fechar") ||
    replyNorm.includes("deseja mais") ||
    replyNorm.includes("quer adicionar") ||
    replyNorm.includes("gostaria de adicionar") ||
    replyNorm.includes("quer algo mais") ||
    replyNorm.includes("deseja algo mais");
  if (alreadyAsks) return replyText;

  // Indicadores de fechamento: total, resumo, ou anotado + valor/peso.
  const hasClosureMarker =
    /\btotal\s*[:r$]/.test(replyNorm) ||
    replyNorm.includes("resumo do pedido") ||
    replyNorm.includes("resumo do seu pedido") ||
    replyNorm.includes("seu pedido completo") ||
    replyNorm.includes("seu pedido atualizado") ||
    replyNorm.includes("vamos fechar") ||
    replyNorm.includes("vamos finalizar") ||
    // "Anotado" + ao menos um item ou preço (≥ 1 R$ ou peso ou quantidade)
    (/\banotad|anotei\b/.test(replyNorm) &&
      (/\br\$\s*\d/.test(replyNorm) || /\d+\s*kg\b/.test(replyNorm)));
  if (!hasClosureMarker) return replyText;

  return `${replyText.trimEnd()}\n\nGostaria de mais alguma coisa ou podemos finalizar? 😊`;
}

// ── Guardrail: não enviar Pix/sinal junto da pergunta "mais alguma coisa?" ──

/**
 * Se a resposta contém a pergunta "mais alguma coisa / podemos finalizar?" e
 * TAMBÉM contém dados de pagamento (Pix, sinal 50%, comprovante), esta função
 * corta a parte de pagamento — a menos que o cliente já tenha fechado o pedido.
 *
 * Racional: o fluxo correto é (1) perguntar, (2) esperar o "não/só isso/pode
 * finalizar" do cliente e SÓ DEPOIS (3) mandar o Pix.
 */
export function enforceAskBeforePayment(
  replyText: string,
  currentMessage: string,
  history: { role: "user" | "assistant"; content: string }[]
): string {
  if (!replyText) return replyText;

  const replyNorm = normalizeForCompare(replyText);
  const currentNorm = normalizeForCompare(currentMessage);

  // 1. Cliente já fechou o pedido em mensagem atual ou recente?
  //    Se sim, é liberado mandar pagamento.
  const doneMarkers = [
    "so isso",
    "só isso",
    "é isso",
    "e isso",
    "nada mais",
    "nao quero mais",
    "não quero mais",
    "pode fechar",
    "pode finalizar",
    "finaliza",
    "finalizar",
    "bora pagar",
    "quero pagar",
    "fechou",
  ];
  const hitDone = (t: string) => doneMarkers.some((m) => t.includes(m));
  const recentUserText = history
    .filter((h) => h.role === "user")
    .slice(-2)
    .map((h) => normalizeForCompare(h.content))
    .join(" ");
  if (hitDone(currentNorm) || hitDone(recentUserText)) return replyText;

  // 2. A resposta pergunta pelo MÉTODO de pagamento ("como vai ser o
  //    pagamento", "prefere PIX ou na loja", "forma de pagamento")? Esse caso
  //    é grave: o agente está querendo fechar sem antes perguntar se falta algo.
  // Note: evitamos `\b` depois de "pagament" porque não há boundary entre
  // "t" e "o" em "pagamento". Usamos `pagament\w*` pra pegar variações.
  const asksPaymentMethod =
    /\b(como\s+(?:vai\s+ser|ser[aá])\s+o?\s*pagament\w*|forma\s+de\s+pagament\w*|forma\s+do\s+pagament\w*|qual\s+(?:a\s+)?forma\s+de\s+pagament\w*|prefere\s+pagar|quer\s+pagar\s+(?:com|via|em|por|de)|pagar\s+(?:com|via|em|por)\s+(?:pix|cart|dinheir|d[eé]bit|cr[eé]dit)|pix\s+(?:ou|\/|,)\s*(?:dinheiro|cart[aã]o|na\s+loja|balc[aã]o|d[eé]bito|cr[eé]dito)|na\s+loja\s+ou\s+pix)/i;
  if (asksPaymentMethod.test(replyText)) {
    // Substitui por pergunta de continuidade — SÓ depois que cliente fechar
    // é que perguntamos forma de pagamento.
    return "Anotei! Antes de fechar, gostaria de mais alguma coisa ou podemos finalizar? 😊";
  }

  // 3. A resposta contém pergunta aberta sobre continuidade?
  const askContinue =
    replyNorm.includes("mais alguma coisa") ||
    replyNorm.includes("podemos finalizar") ||
    replyNorm.includes("deseja mais") ||
    replyNorm.includes("quer adicionar") ||
    replyNorm.includes("gostaria de adicionar") ||
    replyNorm.includes("quer algo mais") ||
    replyNorm.includes("deseja algo mais");
  if (!askContinue) return replyText;

  // 4. A resposta contém info de pagamento (chave, sinal, dados bancários)?
  const paymentMarker = /\b(pix\b|chave\s*pix|50\s*%|sinal|entrada\s*de|comprovante|para\s*confirmar\s*o\s*pedido|valor\s*da\s*entrada|banco\s+[a-z]|nubank|ag[eê]ncia|conta\s*\d)/i;
  if (!paymentMarker.test(replyText)) return replyText;

  // 4. Cortar a resposta antes do primeiro marcador de pagamento.
  const match = replyText.match(paymentMarker);
  if (!match || match.index == null || match.index < 20) {
    // Se o marcador está logo no começo, substituir a resposta inteira pela pergunta.
    return "Anotei tudo! Gostaria de mais alguma coisa ou podemos finalizar? 😊";
  }
  let truncated = replyText.slice(0, match.index).trimEnd();
  // Remover marcadores comuns que sobram no fim ("**", "—", "Pix:", etc.)
  truncated = truncated.replace(/[-—*:]+\s*$/g, "").trim();

  // Garantir que a pergunta de continuidade aparece no fim do texto truncado.
  const truncatedNorm = normalizeForCompare(truncated);
  const stillAsks =
    truncatedNorm.includes("mais alguma coisa") ||
    truncatedNorm.includes("podemos finalizar") ||
    truncatedNorm.includes("deseja mais") ||
    truncatedNorm.includes("quer adicionar") ||
    truncatedNorm.includes("gostaria de adicionar") ||
    truncatedNorm.includes("quer algo mais") ||
    truncatedNorm.includes("deseja algo mais");
  if (!stillAsks) {
    truncated = `${truncated}\n\nGostaria de mais alguma coisa ou podemos finalizar? 😊`;
  }
  return truncated;
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
