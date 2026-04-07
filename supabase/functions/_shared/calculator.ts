/**
 * calculator.ts — Calculadora de pedidos FORA da LLM.
 *
 * A LLM NÃO faz contas sozinha. Quem calcula é esta camada.
 * A LLM recebe os valores já calculados e só apresenta ao cliente.
 *
 * Funções:
 * - calcularBolo(sabor, peso, recipes) → valor
 * - calcularBoloMeioAMeio(sabor1, sabor2, peso, recipes) → valor
 * - calcularSalgados(quantidade) → valor
 * - calcularTotal(itens, taxa?, decoracao?) → total
 * - calcularEntrada(total) → { precisaEntrada, valorEntrada }
 * - validarQuantidadeSalgados(quantidade) → { valido, sugestao }
 * - dividirBoloGrande(pesoTotal) → formas[]
 */

// ── Tipos ──

export interface RecipeInfo {
  name: string;
  sale_price?: number | null;  // preço por kg
  slice_price?: number | null;  // preço fatia
  whole_price?: number | null;  // preço inteiro
}

export interface ItemCalculado {
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  detalhes?: string;
}

export interface ResultadoCalculo {
  itens: ItemCalculado[];
  subtotal: number;
  taxaEntrega: number;
  decoracao: number;
  total: number;
  precisaEntrada: boolean;
  valorEntrada: number;
  resumoTexto: string;
}

// ── Constantes ──

const PRECO_FATIA = 25;
const PRECO_CENTO_SALGADOS = 175;
const MIN_SALGADOS_POR_SABOR = 25;
const DECORACAO_VALOR = 30;
const LIMITE_FORMA_KG = 4;
const LIMIAR_ENTRADA = 300;
const MINIMO_DELIVERY = 50;

// ── Funções de cálculo ──

/**
 * Encontra o preço por kg de um sabor no cardápio.
 * Retorna null se não encontrar.
 */
export function buscarPrecoKg(sabor: string, recipes: RecipeInfo[]): number | null {
  const normalizado = sabor.toLowerCase().trim();
  const recipe = recipes.find(
    (r) => r.name.toLowerCase().trim() === normalizado
  );
  if (!recipe) return null;
  // sale_price = preço por kg para bolos
  return recipe.sale_price != null ? Number(recipe.sale_price) : null;
}

/**
 * Calcula o preço de um bolo por kg.
 */
export function calcularBolo(
  sabor: string,
  pesoKg: number,
  recipes: RecipeInfo[]
): { valor: number; precoKg: number } | null {
  const precoKg = buscarPrecoKg(sabor, recipes);
  if (precoKg == null) return null;
  return {
    valor: precoKg * pesoKg,
    precoKg,
  };
}

/**
 * Calcula bolo meio a meio.
 * Usa o MAIOR preço/kg entre os dois sabores × peso total.
 */
export function calcularBoloMeioAMeio(
  sabor1: string,
  sabor2: string,
  pesoKg: number,
  recipes: RecipeInfo[]
): { valor: number; precoKg: number; saborMaisCaro: string } | null {
  const preco1 = buscarPrecoKg(sabor1, recipes);
  const preco2 = buscarPrecoKg(sabor2, recipes);
  if (preco1 == null || preco2 == null) return null;

  const maiorPreco = Math.max(preco1, preco2);
  const saborMaisCaro = preco1 >= preco2 ? sabor1 : sabor2;

  return {
    valor: maiorPreco * pesoKg,
    precoKg: maiorPreco,
    saborMaisCaro,
  };
}

/**
 * Calcula mini salgados.
 */
export function calcularSalgados(quantidade: number): {
  valor: number;
  precoUnitario: number;
} {
  return {
    valor: (quantidade / 100) * PRECO_CENTO_SALGADOS,
    precoUnitario: PRECO_CENTO_SALGADOS / 100,
  };
}

/**
 * Valida se a quantidade de salgados é múltiplo de 25.
 * Se não for, sugere os dois múltiplos mais próximos.
 */
export function validarQuantidadeSalgados(quantidade: number): {
  valido: boolean;
  sugestaoInferior: number;
  sugestaoSuperior: number;
} {
  const valido = quantidade % MIN_SALGADOS_POR_SABOR === 0 && quantidade >= MIN_SALGADOS_POR_SABOR;
  const inferior = Math.floor(quantidade / MIN_SALGADOS_POR_SABOR) * MIN_SALGADOS_POR_SABOR;
  const superior = Math.ceil(quantidade / MIN_SALGADOS_POR_SABOR) * MIN_SALGADOS_POR_SABOR;
  return {
    valido,
    sugestaoInferior: inferior < MIN_SALGADOS_POR_SABOR ? MIN_SALGADOS_POR_SABOR : inferior,
    sugestaoSuperior: superior < MIN_SALGADOS_POR_SABOR ? MIN_SALGADOS_POR_SABOR : superior,
  };
}

/**
 * Calcula fatias de bolo do dia.
 */
export function calcularFatias(quantidade: number): {
  valor: number;
  precoUnitario: number;
} {
  return {
    valor: quantidade * PRECO_FATIA,
    precoUnitario: PRECO_FATIA,
  };
}

/**
 * Divide um bolo grande em múltiplas formas.
 * Limite da forma: 4kg.
 */
export function dividirBoloGrande(pesoTotal: number): number[] {
  if (pesoTotal <= LIMITE_FORMA_KG) return [pesoTotal];

  const formas: number[] = [];
  let restante = pesoTotal;
  while (restante > 0) {
    if (restante > LIMITE_FORMA_KG) {
      formas.push(LIMITE_FORMA_KG);
      restante -= LIMITE_FORMA_KG;
    } else {
      formas.push(restante);
      restante = 0;
    }
  }
  return formas;
}

/**
 * Calcula se precisa de entrada de 50%.
 */
export function calcularEntrada(total: number): {
  precisaEntrada: boolean;
  valorEntrada: number;
  valorRestante: number;
} {
  const precisaEntrada = total > LIMIAR_ENTRADA;
  const valorEntrada = precisaEntrada ? Math.ceil(total / 2 * 100) / 100 : total;
  const valorRestante = precisaEntrada ? total - valorEntrada : 0;
  return { precisaEntrada, valorEntrada, valorRestante };
}

/**
 * Verifica se o total atinge o mínimo para delivery.
 */
export function verificarMinimoDelivery(subtotal: number): {
  atinge: boolean;
  falta: number;
} {
  return {
    atinge: subtotal >= MINIMO_DELIVERY,
    falta: subtotal < MINIMO_DELIVERY ? MINIMO_DELIVERY - subtotal : 0,
  };
}

/**
 * Calcula o total final de um pedido completo.
 */
export function calcularTotal(
  itens: ItemCalculado[],
  taxaEntrega: number = 0,
  temDecoracao: boolean = false
): ResultadoCalculo {
  const subtotal = itens.reduce((sum, item) => sum + item.subtotal, 0);
  const decoracao = temDecoracao ? DECORACAO_VALOR : 0;
  const total = subtotal + taxaEntrega + decoracao;
  const { precisaEntrada, valorEntrada } = calcularEntrada(total);

  // Montar resumo em texto para a LLM apresentar
  const linhas = itens.map(
    (item) =>
      `• ${item.descricao}: ${item.quantidade > 1 ? `${item.quantidade} × ` : ""}R$${item.precoUnitario.toFixed(2)} = R$${item.subtotal.toFixed(2)}${item.detalhes ? ` (${item.detalhes})` : ""}`
  );

  if (temDecoracao) {
    linhas.push(`• Decoração: +R$${DECORACAO_VALOR.toFixed(2)}`);
  }
  if (taxaEntrega > 0) {
    linhas.push(`• Taxa de entrega: R$${taxaEntrega.toFixed(2)}`);
  }
  linhas.push(`Total: R$${total.toFixed(2)}`);
  if (precisaEntrada) {
    linhas.push(`Entrada (50%): R$${valorEntrada.toFixed(2)}`);
  }

  return {
    itens,
    subtotal,
    taxaEntrega,
    decoracao,
    total,
    precisaEntrada,
    valorEntrada,
    resumoTexto: linhas.join("\n"),
  };
}

// ── Validação de horário ──

/**
 * Verifica se um horário de encomenda tem antecedência suficiente.
 */
export function validarAntecedenciaEncomenda(
  horaDesejada: Date,
  agora: Date = new Date()
): { valido: boolean; horasSugeridas: number; horarioMinimo: Date } {
  const diffMs = horaDesejada.getTime() - agora.getTime();
  const diffHoras = diffMs / (1000 * 60 * 60);
  const MINIMO_HORAS = 4;

  const horarioMinimo = new Date(agora.getTime() + MINIMO_HORAS * 60 * 60 * 1000);

  return {
    valido: diffHoras >= MINIMO_HORAS,
    horasSugeridas: MINIMO_HORAS,
    horarioMinimo,
  };
}

/**
 * Verifica se está dentro do horário de funcionamento.
 * Segunda a sábado, 7h30 às 19h30.
 */
/** Retorna Date ajustada para fuso de São Paulo (UTC-3). */
function nowSaoPaulo(): Date {
  // Supabase Edge roda em UTC. Converter para SP.
  const utc = new Date();
  const spStr = utc.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  return new Date(spStr);
}

export function verificarHorarioFuncionamento(
  data?: Date
): { aberto: boolean; horaSp: string; mensagem: string } {
  const sp = data || nowSaoPaulo();
  const dia = sp.getDay(); // 0=dom, 6=sab
  const hora = sp.getHours();
  const minuto = sp.getMinutes();
  const minutosTotal = hora * 60 + minuto;
  const horaStr = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

  // Domingo
  if (dia === 0) {
    return {
      aberto: false,
      horaSp: horaStr,
      mensagem: "Domingo nao abrimos. Fora do horario so aceitamos ENCOMENDAS. Posso anotar sua encomenda pro proximo dia util a partir das 9h!",
    };
  }

  // Antes das 7:30
  if (minutosTotal < 7 * 60 + 30) {
    return {
      aberto: false,
      horaSp: horaStr,
      mensagem: `Agora sao ${horaStr} e estamos fora do horario (7h30-19h30). Fora do horario so aceitamos ENCOMENDAS. Se a encomenda for pra HOJE, o horario minimo e a partir das 12h. Se for pra AMANHA ou outro dia, a partir das 9h. Qual dia e horario fica bom?`,
    };
  }

  // Depois das 19:30
  if (minutosTotal > 19 * 60 + 30) {
    return {
      aberto: false,
      horaSp: horaStr,
      mensagem: `Agora sao ${horaStr} e estamos fora do horario (7h30-19h30). Fora do horario so aceitamos ENCOMENDAS. Como ja passou do horario, a encomenda seria pra amanha ou outro dia, a partir das 9h. Qual dia e horario?`,
    };
  }

  return { aberto: true, horaSp: horaStr, mensagem: "" };
}

/**
 * Verifica se o delivery está disponível no horário.
 * Delivery começa às 9h.
 */
export function verificarHorarioDelivery(
  data?: Date
): { disponivel: boolean; mensagem: string } {
  const sp = data || nowSaoPaulo();
  const hora = sp.getHours();
  if (hora < 9) {
    return {
      disponivel: false,
      mensagem: "O delivery começa às 9h. Qual horário depois das 9h fica bom?",
    };
  }
  return { disponivel: true, mensagem: "" };
}
