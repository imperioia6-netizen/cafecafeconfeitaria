/**
 * routeNotes.ts — Roteador de intenção → notas do knowledge_base.
 *
 * Versão com prioridade de contexto.
 * Mapeia intent + entities detectadas na mensagem para os caminhos
 * de notas que devem ser buscados no knowledge_base.
 */

export type Intent =
  | "greeting"
  | "returning_customer"
  | "cancel"
  | "hours"
  | "address"
  | "payment"
  | "delivery"
  | "delivery_fee"
  | "cakes"
  | "cake_slice"
  | "savories"
  | "mini_savories"
  | "sweets"
  | "drinks"
  | "order_now"
  | "pre_order"
  | "pricing"
  | "exceptions"
  | "order_status"
  | "unknown";

export type Entities = {
  mentionsCake?: boolean;
  mentionsSlice?: boolean;
  mentionsMiniSavory?: boolean;
  mentionsSavory?: boolean;
  mentionsSweets?: boolean;
  mentionsDrink?: boolean;
  mentionsDelivery?: boolean;
  mentionsPickup?: boolean;
  mentionsPayment?: boolean;
  mentionsNeighborhood?: string | null;
  mentionsCustomCake?: boolean;
};

const NOTE_ROUTES: Record<Intent, string[]> = {
  greeting: [
    "sistema/identidade-da-marca",
    "sistema/tom-de-voz"
  ],
  returning_customer: [
    "fluxos/fluxo-cliente-retornando",
    "sistema/tom-de-voz",
    "sistema/identidade-da-marca",
    "operacao/status-pedido"
  ],
  cancel: [
    "fluxos/fluxo-cancelamento",
    "sistema/tom-de-voz"
  ],
  hours: [
    "operacao/horarios",
    "sistema/horario-sistema",
    "operacao/delivery"
  ],
  address: [
    "operacao/retirada",
    "sistema/identidade-da-marca",
    "fluxos/fluxo-retirada"
  ],
  payment: [
    "operacao/formas-de-pagamento",
    "operacao/pix",
    "fluxos/fluxo-pix",
    "sistema/registro-pedido-automatico"
  ],
  delivery: [
    "operacao/delivery",
    "operacao/taxas",
    "fluxos/fluxo-delivery"
  ],
  delivery_fee: [
    "operacao/taxas",
    "fluxos/fluxo-taxa"
  ],
  cakes: [
    "cardapio/bolos",
    "restricoes/produtos-que-nao-fazemos",
    "operacao/encomenda",
    "operacao/delivery"
  ],
  cake_slice: [
    "cardapio/fatias",
    "memoria-op/memoria-operacional"
  ],
  savories: [
    "cardapio/salgados",
    "operacao/delivery",
    "operacao/formas-de-pagamento"
  ],
  mini_savories: [
    "cardapio/mini-salgados",
    "operacao/encomenda",
    "fluxos/fluxo-encomenda"
  ],
  sweets: [
    "cardapio/doces",
    "operacao/encomenda",
    "fluxos/fluxo-encomenda"
  ],
  drinks: [
    "cardapio/bebidas"
  ],
  order_now: [
    "fluxos/fluxo-pedido-completo",
    "sistema/validacao-do-pedido",
    "sistema/registro-pedido-automatico",
    "operacao/formas-de-pagamento",
    "operacao/delivery",
    "operacao/retirada",
    "operacao/encomenda",
    "operacao/taxas",
    "modelos/perguntas",
    "modelos/respostas",
    "restricoes/produtos-que-nao-fazemos",
    "cardapio/salgados",
    "cardapio/mini-salgados",
    "cardapio/bolos",
    "vendas/upsell"
  ],
  pre_order: [
    "operacao/encomenda",
    "operacao/delivery",
    "operacao/retirada",
    "operacao/taxas",
    "fluxos/fluxo-encomenda",
    "sistema/validacao-do-pedido",
    "sistema/registro-pedido-automatico",
    "modelos/perguntas",
    "modelos/respostas",
    "restricoes/produtos-que-nao-fazemos",
    "cardapio/salgados",
    "cardapio/mini-salgados",
    "cardapio/bolos"
  ],
  pricing: [
    "cardapio/bolos",
    "cardapio/mini-salgados",
    "cardapio/doces",
    "cardapio/salgados",
    "cardapio/bebidas",
    "operacao/taxas"
  ],
  exceptions: [
    "restricoes/produtos-que-nao-fazemos",
    "restricoes/erros-comuns",
    "sistema/excecoes",
    "operacao/encomenda",
    "operacao/horarios"
  ],
  order_status: [
    "operacao/status-pedido"
  ],
  unknown: [
    "sistema/tom-de-voz",
    "sistema/regras-de-ouro",
    "modelos/respostas"
  ]
};

function pushIfMissing(target: string[], value: string) {
  if (!target.includes(value)) {
    target.push(value);
  }
}

export function routeNotes(intent: Intent, entities: Entities): string[] {
  // SEMPRE carregar regras conversacionais, tom de voz e informações operacionais críticas
  const notes = [
    "sistema/fluxo-conversacional",
    "sistema/fluxo-geral-atendimento",
    "sistema/tom-de-voz",
    "sistema/regras-do-proprietario",
    "sistema/regras-de-ouro",
    "restricoes/regras-fluxo-conversa",
    "restricoes/erros-comuns",
    "restricoes/produtos-que-nao-fazemos",
    "operacao/horarios",
    "sistema/horario-sistema",
    ...(NOTE_ROUTES[intent] || NOTE_ROUTES.unknown),
  ];

  if (entities.mentionsCake) {
    pushIfMissing(notes, "cardapio/bolos");
  }

  if (entities.mentionsSlice) {
    pushIfMissing(notes, "cardapio/fatias");
    pushIfMissing(notes, "memoria-op/memoria-operacional");
  }

  if (entities.mentionsMiniSavory) {
    pushIfMissing(notes, "cardapio/mini-salgados");
    pushIfMissing(notes, "operacao/encomenda");
  }

  if (entities.mentionsSavory) {
    pushIfMissing(notes, "cardapio/salgados");
  }

  if (entities.mentionsSweets) {
    pushIfMissing(notes, "cardapio/doces");
  }

  if (entities.mentionsDrink) {
    pushIfMissing(notes, "cardapio/bebidas");
  }

  if (entities.mentionsDelivery) {
    pushIfMissing(notes, "operacao/delivery");
    pushIfMissing(notes, "operacao/taxas");
    pushIfMissing(notes, "fluxos/fluxo-delivery");
  }

  if (entities.mentionsPickup) {
    pushIfMissing(notes, "operacao/retirada");
    pushIfMissing(notes, "fluxos/fluxo-retirada");
  }

  if (entities.mentionsPayment) {
    pushIfMissing(notes, "operacao/formas-de-pagamento");
    pushIfMissing(notes, "operacao/pix");
    pushIfMissing(notes, "fluxos/fluxo-pix");
  }

  if (entities.mentionsNeighborhood) {
    pushIfMissing(notes, "operacao/taxas");
  }

  if (entities.mentionsCustomCake) {
    pushIfMissing(notes, "cardapio/bolos");
    pushIfMissing(notes, "restricoes/produtos-que-nao-fazemos");
  }

  return notes;
}
