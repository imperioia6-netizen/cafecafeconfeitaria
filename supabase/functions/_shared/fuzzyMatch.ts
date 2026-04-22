/**
 * fuzzyMatch.ts — Matching tolerante a typo, abreviação e gíria.
 *
 * Cliente escreve no WhatsApp de qualquer jeito. "brigadero", "brig",
 * "prestigo", "presteje", "truf", "ninho c nutela", "moca", "morango cremoso"
 * — tudo tem que encontrar o item certo. Usa combinação de:
 *   - Normalização de acento/case.
 *   - Tokenização por palavra.
 *   - Distância de Levenshtein (typo até 2 chars pra palavras longas).
 *   - Abreviações (prefix match).
 *   - Dicionário de sinônimos/gírias.
 */

// ── Normalização ──

export function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length > 0);
}

// ── Sinônimos / gírias ──
// Chave = token normalizado; valor = lista de variantes que o cliente pode
// escrever e devem ser tratadas como equivalentes. Não reescreve o cardápio,
// só expande o vocabulário de entrada.

// CONVENÇÃO: chave = forma canônica (como aparece no cardápio/ops), valores
// = variantes que o cliente pode escrever (typos, gírias, abreviações).
const SYNONYMS: Record<string, string[]> = {
  // Sabores comuns (canônico = como está no catalog.ts, normalizado)
  "nutella": ["nutela"],
  "morango": ["moranguinho", "morangao"],
  "ninho": ["leite ninho", "leite moca", "leite moça"],
  "brigadeiro": ["brigadero", "brigadeirão", "brigadeirao", "brig", "brigadeirinho"],
  "prestigio": ["prestije", "prestiejo", "prestigo", "prestige"],
  "trufado": ["trufa", "truf", "trufadinho"],
  "chocolate": ["choco", "xocolate", "xocolat"],
  "maracuja": ["marakuja"],
  "cocada": ["coco ralado"],
  "limao": ["limaozinho"],
  "bicho de pe": ["bichinho de pe", "bicho pe"],
  "pessego": [],
  "floresta negra": ["fl negra"],
  "floresta branca": ["fl branca"],
  "olho de sogra": ["olho-de-sogra"],
  "sonho de valsa": ["sonho valsa", "s valsa"],
  "pacoca": [],
  "nozes": ["nozinhos"],
  // Salgados (canônico = como no catalog.ts)
  "coxinha": ["coxinhas", "coxinhazinha", "coxi"],
  "kibe": ["quibe", "kibbe"],
  "risoles": ["rissoles", "rissole", "risolis"],
  "empada": ["empadinha", "empadas", "empadinhas"],
  "bolinho de carne": ["bolinho carne", "bolinha de carne"],
  "bolinho de queijo": ["bolinho queijo", "bolinha de queijo"],
  "esfiha": ["esfirra", "esfihas", "esfirras"],
  "hamburgao": ["hambugao", "hamburguer gigante"],
  "pao de batata": ["paozinho de batata"],
  "enroladinho": ["enroladinho de salsicha"],
  "catupiry": ["catupiri", "catupirinho"],
  // Doces
  "beijinho": ["beijo", "beijinhos"],
  "docinho": ["docinhos", "docin"],
  "bem casado": ["bem-casado", "bemcasado"],
  // Bebidas
  "refrigerante": ["refri", "refrigerantes", "ks", "ksks"],
  "suco": ["sucos", "sukinho"],
  "agua": ["aguinha"],
  "toddynho": ["toddy", "todynho"],
  // Termos de operação — MUITO importante pra entender gíria regional
  "delivery": ["entrega", "entregar", "deliverys", "entregar em casa"],
  "retirada": [
    "retirar",
    "retira",
    "retiro",
    "busco",
    "buscar",
    "pego",
    "pegar",
    "passo ai",
    "passo la",
    "passo la na loja",
    "passo na loja",
    "vou ai",
    "vou la",
    "vou pegar",
    "pegar na loja",
    "buscar na loja",
  ],
  "encomenda": [
    "encomendar",
    "encomendada",
    "reservar",
    "reserva",
    "agendar",
    "agendamento",
    "pra amanha",
    "pra depois",
    "pra semana",
    "reservar bolo",
  ],
  "pix": ["picse", "pics", "chave pix"],
  // Abreviações universais
  "com": ["c"],
  "sem": ["s"],
  "para": ["pra", "p", "p/"],
};

/** Reverse lookup: variante → token canônico. */
const REVERSE_SYN: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [canonical, variants] of Object.entries(SYNONYMS)) {
    map.set(normalize(canonical), normalize(canonical));
    for (const v of variants) map.set(normalize(v), normalize(canonical));
  }
  return map;
})();

/** Canoniza um token: se é variante/gíria, retorna o canônico. */
export function canonicalize(token: string): string {
  const n = normalize(token);
  return REVERSE_SYN.get(n) ?? n;
}

// ── Levenshtein (edição de distância) ──

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** Threshold dinâmico: palavras curtas → 1 edição; médias → 2; longas → 3. */
function maxDist(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return 3;
}

// ── Busca principal ──

export interface FuzzyMatchResult<T> {
  item: T;
  score: number; // 0..1, maior = mais próximo
  matchedTokens: string[];
}

/**
 * Procura `query` na lista de `items`. Cada item é acessado por `getName`.
 * Retorna o melhor match se score ≥ threshold (default 0.55).
 */
export function fuzzyFindBest<T>(
  query: string,
  items: T[],
  getName: (it: T) => string,
  threshold = 0.55
): FuzzyMatchResult<T> | null {
  const qTokens = tokenize(query).map(canonicalize);
  if (qTokens.length === 0 || items.length === 0) return null;

  let best: FuzzyMatchResult<T> | null = null;

  for (const item of items) {
    const nameNorm = normalize(getName(item));
    // Canonizar tokens do nome do cardápio também, para alinhar com
    // abreviações do cliente ("c" → "com", etc.).
    const nameTokens = nameNorm.split(" ").map(canonicalize);
    if (nameTokens.length === 0) continue;

    // 1) Match exato substring (case/acento insensível).
    //    Consideramos tanto a query original normalizada quanto a canonizada.
    const qJoined = qTokens.join(" ");
    const nameCanonJoined = nameTokens.join(" ");
    if (
      qJoined.includes(nameCanonJoined) ||
      nameCanonJoined.includes(qJoined) ||
      qJoined.includes(nameNorm) ||
      nameNorm.includes(qJoined)
    ) {
      const score = Math.min(1, nameNorm.length / Math.max(1, qJoined.length));
      if (!best || score > best.score) {
        best = { item, score: Math.max(0.9, score), matchedTokens: nameTokens };
      }
      continue;
    }

    // 2) Conta quantos tokens do nome aparecem (fuzzy) na query.
    //    Stopwords curtas do cliente ("do", "em", "na", "amo") NÃO contam
    //    como match — evita "bolo amo voce" casar com "Dois Amores".
    const STOPWORDS = new Set([
      "de",
      "do",
      "da",
      "das",
      "dos",
      "em",
      "no",
      "na",
      "nos",
      "nas",
      "com",
      "sem",
      "para",
      "pra",
      "por",
      "um",
      "uma",
      "o",
      "a",
      "os",
      "as",
      "e",
      "ou",
      "eu",
      "me",
      "te",
      "lhe",
      "seu",
      "sua",
      "ai",
      "la",
      "ali",
      "so",
    ]);
    let hits = 0;
    const matched: string[] = [];
    for (const tn of nameTokens) {
      const tnLen = tn.length;
      const limit = maxDist(tnLen);
      const hit = qTokens.some((tq) => {
        if (!tq) return false;
        // Token da query MUITO curto não casa — só igualdade exata exata.
        if (tq.length < 4) return tq === tn;
        if (tq === tn) return true;
        // Prefix/suffix precisam que AMBOS tenham ≥4 chars.
        if (tnLen >= 4 && tq.length >= 4) {
          if (tq.startsWith(tn) && tn.length >= 4) return true;
          if (tn.startsWith(tq) && tq.length >= 4 && tn.length - tq.length <= 3) return true;
        }
        if (Math.abs(tq.length - tnLen) > limit) return false;
        return levenshtein(tq, tn) <= limit;
      });
      if (hit) {
        hits++;
        matched.push(tn);
      }
    }
    // Pelo menos UM token significativo (não stopword) precisa ter batido.
    const significantMatched = matched.filter((t) => !STOPWORDS.has(t) && t.length >= 4);
    const score = significantMatched.length === 0 ? 0 : hits / nameTokens.length;
    if (!best || score > best.score) {
      best = { item, score, matchedTokens: matched };
    }
  }

  if (best && best.score >= threshold) return best;
  return null;
}

/**
 * Retorna todas as sugestões (acima do threshold) ordenadas por score desc.
 */
export function fuzzyFindAll<T>(
  query: string,
  items: T[],
  getName: (it: T) => string,
  threshold = 0.45,
  limit = 5
): FuzzyMatchResult<T>[] {
  const out: FuzzyMatchResult<T>[] = [];
  for (const item of items) {
    const res = fuzzyFindBest(query, [item], getName, 0);
    if (res && res.score >= threshold) out.push(res);
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
