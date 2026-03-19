/**
 * orderValidator.ts — Validador de fechamento de pedido.
 *
 * Verifica se todos os campos necessários estão preenchidos
 * antes de permitir o registro na plataforma.
 *
 * Retorna uma lista de campos faltantes para que a LLM
 * saiba o que perguntar ao cliente.
 */

export interface DadosPedido {
  customerName?: string | null;
  customerPhone?: string | null;
  items?: { name: string; quantity: number; weight?: number }[];
  modalidade?: "delivery" | "encomenda" | "retirada" | null;
  endereco?: string | null;
  bairro?: string | null;
  dataEntrega?: string | null;
  horarioEntrega?: string | null;
  formaPagamento?: string | null;
  totalCalculado?: number | null;
  clienteConfirmou?: boolean;
}

export interface ValidacaoResult {
  valido: boolean;
  camposFaltantes: string[];
  proximaPergunta: string | null;
}

/**
 * Valida se o pedido tem todos os campos necessários.
 * Retorna os campos faltantes em ordem de prioridade.
 */
export function validarPedido(dados: DadosPedido): ValidacaoResult {
  const faltantes: string[] = [];

  // 1. Itens (obrigatório sempre)
  if (!dados.items || dados.items.length === 0) {
    faltantes.push("itens");
  }

  // 2. Modalidade (obrigatório sempre)
  if (!dados.modalidade) {
    faltantes.push("modalidade");
  }

  // 3. Nome (obrigatório)
  if (!dados.customerName) {
    faltantes.push("nome");
  }

  // 4. Se delivery: endereço e bairro
  if (dados.modalidade === "delivery") {
    if (!dados.endereco) faltantes.push("endereco");
    if (!dados.bairro) faltantes.push("bairro");
  }

  // 5. Se encomenda: data e horário
  if (dados.modalidade === "encomenda") {
    if (!dados.dataEntrega) faltantes.push("data_entrega");
    if (!dados.horarioEntrega) faltantes.push("horario_entrega");
    // Se vai entregar (não retirar), precisa endereço também
    // Isso é tratado pelo fluxo na conversa
  }

  // 6. Se retirada: horário
  if (dados.modalidade === "retirada") {
    if (!dados.horarioEntrega) faltantes.push("horario_retirada");
  }

  // 7. Total calculado
  if (dados.totalCalculado == null || dados.totalCalculado <= 0) {
    faltantes.push("total");
  }

  // 8. Pagamento
  if (!dados.formaPagamento) {
    faltantes.push("pagamento");
  }

  // 9. Confirmação do cliente
  if (!dados.clienteConfirmou) {
    faltantes.push("confirmacao");
  }

  // Gerar próxima pergunta baseada no primeiro campo faltante
  const proximaPergunta = faltantes.length > 0
    ? gerarPergunta(faltantes[0], dados)
    : null;

  return {
    valido: faltantes.length === 0,
    camposFaltantes: faltantes,
    proximaPergunta,
  };
}

/**
 * Gera a sugestão de próxima pergunta para a LLM.
 */
function gerarPergunta(campo: string, dados: DadosPedido): string {
  switch (campo) {
    case "itens":
      return "O que você gostaria de pedir?";
    case "modalidade":
      return "É retirada, delivery ou encomenda?";
    case "nome":
      return "Qual seu nome pra eu anotar?";
    case "endereco":
      return "Qual seu endereço completo pra entrega?";
    case "bairro":
      return "Qual seu bairro pra eu calcular a taxa?";
    case "data_entrega":
      return "Pra qual data você precisa?";
    case "horario_entrega":
      return "Qual horário de entrega fica bom?";
    case "horario_retirada":
      return "Qual horário quer retirar na loja?";
    case "total":
      return "[SISTEMA] Calcular total do pedido.";
    case "pagamento":
      return "Vai ser PIX, cartão ou dinheiro?";
    case "confirmacao": {
      const total = dados.totalCalculado ?? 0;
      return `O total ficou R$${total.toFixed(2)}. Tudo certo pra confirmar?`;
    }
    default:
      return "Falta alguma informação. O que mais posso anotar?";
  }
}

/**
 * Verifica se um produto existe no cardápio.
 */
export function produtoExiste(
  nomeProduto: string,
  recipes: { name: string }[]
): boolean {
  const normalizado = nomeProduto.toLowerCase().trim();
  return recipes.some((r) => r.name.toLowerCase().trim() === normalizado);
}

/**
 * Encontra o produto mais parecido (fuzzy match simples).
 * Útil quando o cliente escreve "ninho morango" em vez de "Ninho com Morango".
 */
export function buscarProdutoSimilar(
  busca: string,
  recipes: { name: string }[]
): string | null {
  const normalizado = busca.toLowerCase().trim();
  const palavras = normalizado.split(/\s+/);

  // Match exato
  const exato = recipes.find(
    (r) => r.name.toLowerCase().trim() === normalizado
  );
  if (exato) return exato.name;

  // Match parcial: todas as palavras-chave presentes
  const parcial = recipes.find((r) => {
    const nome = r.name.toLowerCase();
    return palavras.every((p) => nome.includes(p));
  });
  if (parcial) return parcial.name;

  // Match por maior sobreposição de palavras
  let melhorMatch: { name: string; score: number } | null = null;
  for (const recipe of recipes) {
    const nomeRecipe = recipe.name.toLowerCase();
    const score = palavras.filter((p) => nomeRecipe.includes(p)).length;
    if (score > 0 && (!melhorMatch || score > melhorMatch.score)) {
      melhorMatch = { name: recipe.name, score };
    }
  }

  return melhorMatch && melhorMatch.score >= palavras.length * 0.5
    ? melhorMatch.name
    : null;
}
