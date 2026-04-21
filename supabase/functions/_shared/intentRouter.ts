/**
 * intentRouter.ts — Roteador de intenção → notas do knowledge_base.
 *
 * Mapeia a intenção detectada + stage para os caminhos de notas
 * que devem ser buscados no knowledge_base.
 *
 * Isso é a "camada de decisão" que escolhe QUAIS conhecimentos
 * o agente precisa para responder aquela mensagem específica.
 */

import type { PromptIntent, PromptStage } from "./atendentePromptModules.ts";

/** Notas que SEMPRE são carregadas, independente do contexto */
const NOTAS_SEMPRE = [
  "atendimento/personalidade",
];

/** Mapeamento: intent → caminhos de notas relevantes */
const INTENT_ROUTES: Record<string, string[]> = {
  greeting: [
    "atendimento/saudacao",
  ],
  ask_price: [
    "cardapio/bolos",
    "cardapio/fatias",
    "cardapio/mini-salgados",
    "sistema/calculo-pedido",
  ],
  ask_recommendation: [
    "cardapio/bolos",
    "cardapio/fatias",
    "cardapio/mini-salgados",
  ],
  start_order: [
    "cardapio/bolos",
    "cardapio/mini-salgados",
    "cardapio/fatias",
    "sistema/calculo-pedido",
    "sistema/validacao-pedido",
    "operacao/horarios",
  ],
  delivery_urgency: [
    "operacao/delivery",
    "operacao/taxas",
    "operacao/horarios",
    "cardapio/fatias",
    "sistema/calculo-pedido",
  ],
  payment_proof: [
    "operacao/pix",
    "sistema/registro-pedido",
    "sistema/validacao-pedido",
  ],
  other: [],
};

/** Notas extras por stage (complementam as do intent) */
const STAGE_EXTRAS: Record<string, string[]> = {
  start: [],
  awaiting_order_type: [
    "operacao/delivery",
    "operacao/encomenda",
    "operacao/retirada",
  ],
  collecting_items: [
    "cardapio/bolos",
    "cardapio/mini-salgados",
    "cardapio/fatias",
    "sistema/calculo-pedido",
  ],
  confirming_order: [
    "sistema/calculo-pedido",
    "sistema/validacao-pedido",
    "operacao/pix",
    "sistema/registro-pedido",
  ],
  awaiting_payment: [
    "operacao/pix",
    "sistema/registro-pedido",
  ],
  post_payment: [
    "sistema/registro-pedido",
  ],
};

/** Notas extras baseadas em palavras-chave na mensagem */
const KEYWORD_ROUTES: { keywords: RegExp; paths: string[] }[] = [
  {
    keywords: /\b(delivery|entrega|entreg[ao]|manda|enviar?|levar?)\b/i,
    paths: ["operacao/delivery", "operacao/taxas", "fluxos/fluxo-delivery"],
  },
  {
    keywords: /\b(encomend[ao]|encomendar|reserv[ao])\b/i,
    paths: ["operacao/encomenda", "fluxos/fluxo-encomenda"],
  },
  {
    keywords: /\b(retir[ao]|buscar|busc[ao]|retirar|pegar)\b/i,
    paths: ["operacao/retirada", "fluxos/fluxo-retirada"],
  },
  {
    keywords: /\b(bolo|bolos)\b/i,
    paths: ["cardapio/bolos"],
  },
  {
    keywords: /\b(fatia|fatias|peda[cç]o)\b/i,
    paths: ["cardapio/fatias"],
  },
  {
    keywords: /\b(salgad[oa]s?|coxinha|kibe|quibe|risoles|empada|pastel|bolinha)\b/i,
    paths: ["cardapio/mini-salgados"],
  },
  {
    keywords: /\b(taxa|frete|entrega|bairro)\b/i,
    paths: ["operacao/taxas"],
  },
  {
    keywords: /\b(pix|pagamento|pagar|comprovante|transferi|transfer[eê]ncia)\b/i,
    paths: ["operacao/pix"],
  },
  {
    keywords: /\b(hor[aá]rio|hora|funciona|abre|fecha|aberto|fechado|domingo|s[aá]bado)\b/i,
    paths: ["operacao/horarios"],
  },
  {
    keywords: /\b(pre[cç]o|quanto|valor|custa|custo)\b/i,
    paths: ["sistema/calculo-pedido"],
  },
  {
    keywords: /\b(decora[cç][aã]o|decorar|enfeite|personaliz)\b/i,
    paths: ["cardapio/bolos"],
  },
  {
    keywords: /\b(a[cç]a[ií])\b/i,
    paths: [], // açaí vem do banco de recipes, não do knowledge_base
  },
];

/**
 * Determina quais notas buscar no knowledge_base.
 *
 * Combina:
 * 1. Notas SEMPRE carregadas (personalidade)
 * 2. Notas por intent
 * 3. Notas extras por stage
 * 4. Notas por palavras-chave na mensagem
 * 5. Se tem pedido em andamento: notas de continuidade
 *
 * Retorna caminhos ÚNICOS (sem duplicatas).
 */
export function routeToNotes(
  intent: PromptIntent,
  stage: PromptStage,
  message: string,
  hasOrderInProgress: boolean
): string[] {
  const paths = new Set<string>(NOTAS_SEMPRE);

  // 1. Notas por intent
  const intentPaths = INTENT_ROUTES[intent] || [];
  intentPaths.forEach((p) => paths.add(p));

  // 2. Notas extras por stage
  const stagePaths = STAGE_EXTRAS[stage] || [];
  stagePaths.forEach((p) => paths.add(p));

  // 3. Notas por palavras-chave na mensagem
  for (const route of KEYWORD_ROUTES) {
    if (route.keywords.test(message)) {
      route.paths.forEach((p) => paths.add(p));
    }
  }

  // 4. Se tem pedido em andamento
  if (hasOrderInProgress) {
    paths.add("sistema/validacao-pedido");
    paths.add("sistema/calculo-pedido");
  }

  return Array.from(paths);
}
