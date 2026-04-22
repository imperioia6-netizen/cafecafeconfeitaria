/**
 * decisionLayer.ts — Camada de decisão que orquestra tudo.
 *
 * ARQUITETURA:
 *
 *   WhatsApp → Webhook → decisionLayer → LLM → Resposta
 *
 * O que esta camada faz:
 * 1. Recebe a mensagem + intent + entities
 * 2. Usa o routeNotes para determinar QUAIS notas buscar
 * 3. Busca as notas do knowledge_base (Supabase)
 * 4. Pré-calcula valores (calculadora FORA da LLM)
 * 5. Monta um contexto PEQUENO e FOCADO para a LLM
 * 6. A LLM só faz: conversar + apresentar + conduzir
 *
 * Obsidian = memória e regras
 * LLM = raciocínio + conversa + condução
 * Automação = motor operacional (cálculos, validações)
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeNotes, type Intent, type Entities } from "./routeNotes.ts";
import {
  calcularBolo,
  calcularBoloMeioAMeio,
  calcularSalgados,
  calcularFatias,
  dividirBoloGrande,
  calcularEntrada,
  verificarHorarioFuncionamento,
  verificarHorarioDelivery,
  validarQuantidadeSalgados,
  type RecipeInfo,
} from "./calculator.ts";
import {
  messageMentionsDecoration,
  messageIsAboutTime,
  messageIsAboutWriting,
} from "./priceEngine.ts";
import { normalizeForCompare } from "./webhookUtils.ts";

// ── Tipos ──

export interface DecisionContext {
  /** Notas do knowledge_base relevantes (conteúdo markdown) */
  notasRelevantes: string;
  /** Cálculos pré-feitos (se houver) */
  calculosTexto: string;
  /** Alertas e validações (se houver) */
  alertas: string[];
  /** Dados de pagamento do CRM */
  paymentInfo: string;
  /** Instruções custom do proprietário */
  customInstructions: string;
  /** Cardápio dinâmico (do banco de recipes) */
  cardapioDetalhado: string;
  /** Zonas de delivery com disponibilidade */
  deliveryZonesTexto: string;
  /** Promoções ativas */
  promoSummary: string;
  /** Dados do açaí */
  cardapioAcai: string;
  /** Nomes exatos dos produtos (para registro) */
  cardapioNomes: string;
  /** Nome do contato */
  contactName: string;
  /** Intent detectada */
  intent: Intent;
}

// ── Detector de entidades ──

/**
 * Detecta entidades na mensagem do cliente.
 * Complementa o intent com informações específicas.
 */
export function detectEntities(message: string): Entities {
  const msg = message.toLowerCase();

  return {
    mentionsCake: /\b(bolo|bolos)\b/i.test(msg),
    mentionsSlice: /\b(fatia|fatias|peda[cç]o)\b/i.test(msg),
    // Plural/singular e palavras maiores (ex.: "coxinhas", "salgadinhos") também contam.
    mentionsMiniSavory: /\bmini\s*(salgad\w*|coxinha\w*|kibe\w*|quibe\w*|risoles?\w*|bolinha\w*|empada\w*)/i.test(msg),
    mentionsSavory: /\b(salgad[oa]s?|coxinhas?|kibes?|quibes?|risoles?|empadas?|past[eé]is?|pastel|bolinhas?)\b/i.test(msg) && !/\bmini\b/i.test(msg),
    mentionsSweets: /\b(doce|doces|docinhos?|brigadeiro|beijinho|cajuzinho|olho.de.sogra)\b/i.test(msg),
    mentionsDrink: /\b(suco|bebida|refrigerante|[aá]gua mineral|ch[aá] gelado)\b/i.test(msg) || (/\b(caf[eé])\b/i.test(msg) && !/caf[eé]\s*caf[eé]/i.test(msg)),
    mentionsDelivery: /\b(delivery|entrega|entreg[ao]|manda|enviar?|levar?)\b/i.test(msg),
    mentionsPickup: /\b(retir[ao]|buscar|busc[ao]|retirar|pegar|loja)\b/i.test(msg),
    mentionsPayment: /\b(pix|pagamento|pagar|comprovante|transferi|cart[aã]o|dinheiro)\b/i.test(msg),
    mentionsNeighborhood: extractNeighborhood(msg),
    mentionsCustomCake: /\b(personaliz|papel.de.arroz|foto.no.bolo|bolo.fake|decorac|decorar|decorado|homem.aranha|princesa|patrulha|frozen|minnie|mickey|aranha|super.her[oó]i|tema|tem[aá]tic|colorid|chantininho|topo.de.bolo|pasta.americana)\b/i.test(msg),
  };
}

/**
 * Tenta extrair o nome do bairro da mensagem.
 */
function extractNeighborhood(msg: string): string | null {
  // Padrões comuns: "moro no Centro", "entrega no Jaguaré", "bairro Vila Yara"
  const patterns = [
    /(?:moro|fico|sou)\s+(?:no|na|do|da|em)\s+([A-ZÀ-Ú][\w\sÀ-ú]+)/i,
    /(?:entrega|delivery)\s+(?:no|na|pra|para|pro|em)\s+([A-ZÀ-Ú][\w\sÀ-ú]+)/i,
    /bairro\s+([A-ZÀ-Ú][\w\sÀ-ú]+)/i,
  ];

  for (const pattern of patterns) {
    const match = msg.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

// ── Busca de notas ──

interface KBRow {
  caminho: string;
  titulo: string;
  conteudo: string;
}

/**
 * Busca notas do knowledge_base por caminhos.
 */
async function fetchNotas(
  supabase: SupabaseClient,
  caminhos: string[]
): Promise<KBRow[]> {
  if (caminhos.length === 0) return [];

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("caminho, titulo, conteudo")
    .in("caminho", caminhos)
    .eq("ativa", true);

  if (error) {
    console.error("fetchNotas error:", error.message);
    return [];
  }

  return (data || []) as KBRow[];
}

// ── Pré-cálculo ──

interface PreCalcResult {
  texto: string;
  alertas: string[];
}

/**
 * Pré-calcula valores da mensagem. A LLM NÃO faz contas — recebe valores prontos.
 * Exportada para poder ser testada isoladamente.
 */
export function preCalcular(
  message: string,
  intent: Intent,
  entities: Entities,
  recipes: RecipeInfo[]
): PreCalcResult {
  const calculos: string[] = [];
  const alertas: string[] = [];

  // Só calcular se faz sentido
  const deveCalcular = [
    "cakes", "cake_slice", "mini_savories", "savories", "sweets",
    "drinks", "pricing", "order_now", "pre_order", "delivery", "delivery_fee"
  ].includes(intent);

  if (!deveCalcular && !entities.mentionsCake && !entities.mentionsMiniSavory && !entities.mentionsSlice) {
    return { texto: "", alertas };
  }

  const msgLower = message.toLowerCase();

  // ── Detectar kg quebrado (antes de tudo) ──
  // 1) Formato numérico: "2,5 kg", "1.5kg".
  const kgQuebraMatch = msgLower.match(/(\d+)[.,](\d+)\s*kg/i);
  if (kgQuebraMatch) {
    const pesoQuebrado = parseFloat(`${kgQuebraMatch[1]}.${kgQuebraMatch[2]}`);
    const pesoInferior = Math.floor(pesoQuebrado);
    const pesoSuperior = Math.ceil(pesoQuebrado);
    alertas.push(
      `[KG_QUEBRADO] Cliente pediu ${pesoQuebrado}kg, mas só trabalhamos com kg INTEIRO. Informe: "A gente trabalha com peso inteiro. Quer que seja de ${pesoInferior}kg ou ${pesoSuperior}kg?" NÃO calcule valor para kg quebrado. NÃO prossiga sem resolver isso.`
    );
    return { texto: "", alertas };
  }
  // 2) Formato por extenso: "meio kg", "um e meio kg", "dois e meio kg", "quilo e meio".
  const textoNumeros: Record<string, number> = {
    meio: 0.5,
    "um e meio": 1.5,
    "quilo e meio": 1.5,
    "dois e meio": 2.5,
    "tres e meio": 3.5,
    "três e meio": 3.5,
    "quatro e meio": 4.5,
  };
  const kgTextoMatch = msgLower.match(
    /\b(meio|um e meio|quilo e meio|dois e meio|tr[eê]s e meio|quatro e meio)\s*(?:kg|quilos?)?\b/i
  );
  if (kgTextoMatch) {
    const chave = kgTextoMatch[1].toLowerCase();
    const pesoQuebrado = textoNumeros[chave] ?? 0.5;
    const pesoInferior = Math.max(1, Math.floor(pesoQuebrado));
    const pesoSuperior = Math.max(1, Math.ceil(pesoQuebrado));
    alertas.push(
      `[KG_QUEBRADO] Cliente pediu ${pesoQuebrado}kg (escrito "${kgTextoMatch[0].trim()}"), mas só trabalhamos com kg INTEIRO. Informe: "A gente trabalha com peso inteiro. Quer que seja de ${pesoInferior}kg ou ${pesoSuperior}kg?" NÃO calcule valor para kg quebrado. NÃO prossiga sem resolver isso.`
    );
    return { texto: "", alertas };
  }

  // ── Detectar bolo meio a meio ──
  const meioAMeioMatch = msgLower.match(
    /meio\s*a\s*meio.*?([\w\sà-ú]+?)\s+(?:e|com)\s+([\w\sà-ú]+?)(?:\s+(?:de\s+)?(\d+)\s*kg)/i
  ) || msgLower.match(
    /(?:bolo\s+(?:de\s+)?)([\w\sà-ú]+?)\s+(?:e|com)\s+([\w\sà-ú]+?)(?:\s+(?:de\s+)?(\d+)\s*kg).*?meio\s*a\s*meio/i
  );
  if (meioAMeioMatch) {
    const sabor1 = meioAMeioMatch[1].trim();
    const sabor2 = meioAMeioMatch[2].trim();
    const peso = parseInt(meioAMeioMatch[3]);
    const resultado = calcularBoloMeioAMeio(sabor1, sabor2, peso, recipes);
    if (resultado) {
      calculos.push(
        `[CÁLCULO MEIO A MEIO] Bolo ${sabor1} + ${sabor2} (${peso}kg): usa o MAIOR preço = R$${resultado.precoKg}/kg × ${peso}kg = R$${resultado.valor.toFixed(2)} (sabor mais caro: ${resultado.saborMaisCaro})`
      );
      const entrada = calcularEntrada(resultado.valor);
      if (entrada.precisaEntrada) {
        calculos.push(
          `[CÁLCULO] Total > R$300 → entrada 50%: R$${entrada.valorEntrada.toFixed(2)}`
        );
      }
    }
  }

  // ── Detectar bolo com peso ──
  const boloMatch = !meioAMeioMatch ? msgLower.match(
    /(?:bolo\s+(?:de\s+)?)([\w\sà-ú]+?)(?:\s+(?:de\s+)?(\d+)\s*kg)/i
  ) : null;
  if (boloMatch) {
    const sabor = boloMatch[1].trim();
    const peso = parseInt(boloMatch[2]);

    if (peso > 4) {
      const formas = dividirBoloGrande(peso);
      calculos.push(
        `[CÁLCULO] Bolo de ${peso}kg → dividir em ${formas.length} formas: ${formas.map((f) => `${f}kg`).join(" + ")}`
      );
    }

    const resultado = calcularBolo(sabor, peso, recipes);
    if (resultado) {
      calculos.push(
        `[CÁLCULO] Bolo ${sabor} ${peso}kg: R$${resultado.precoKg}/kg × ${peso}kg = R$${resultado.valor.toFixed(2)}`
      );
      const entrada = calcularEntrada(resultado.valor);
      if (entrada.precisaEntrada) {
        calculos.push(
          `[CÁLCULO] Total > R$300 → entrada 50%: R$${entrada.valorEntrada.toFixed(2)}`
        );
      }
    }
  }

  // ── Contexto temporal: frase sobre HORÁRIO/DATA nunca vira sabor/item ──
  const isTimeTalk = messageIsAboutTime(message);
  if (isTimeTalk && !entities.mentionsCake && !entities.mentionsMiniSavory && !entities.mentionsSlice) {
    alertas.push(
      `[CONTEXTO_TEMPORAL] A mensagem do cliente é sobre HORÁRIO/DATA (ex.: "pode ser as 9 de amanhã", "marcamos pra segunda", "9h"). NUNCA a interprete como sabor, item ou produto. Se ainda faltar informação do pedido (sabor, peso, tipo), PERGUNTE a informação que falta em vez de dizer que algum "sabor" não está no cardápio. Trate esta mensagem como CONFIRMAÇÃO DE HORÁRIO/DATA da encomenda.`
    );
  }

  // ── Contexto de ESCRITA: o que vem junto é FRASE, não sabor ──
  if (messageIsAboutWriting(message)) {
    alertas.push(
      `[CONTEXTO_ESCRITA] O cliente está pedindo ESCRITA no bolo (ex.: "quero uma escrita em cima do bolo amo voce", "com a frase Feliz Aniversário"). O TEXTO que aparece junto é o CONTEÚDO DA ESCRITA, NÃO sabor. Anote literalmente o texto como frase da escrita (+R$15). NUNCA diga "o sabor '[texto da frase]' não temos". Se o sabor ainda não foi definido no histórico, PERGUNTE o sabor separadamente.`
    );
  }

  // ── Detectar bolo sem peso (só sabor) ──
  // IMPORTANTE: só inferimos sabor quando o sabor bate EXATAMENTE com uma receita
  // do cardápio. Se a frase é sobre decoração ("decoração colorida com flores"),
  // sobre HORÁRIO ("pode ser as 9") ou sobre ESCRITA no bolo ("quero uma escrita
  // em cima do bolo amo voce"), NÃO interpretamos fragmentos como sabor.
  const isWritingTalk = messageIsAboutWriting(message);
  if (
    !boloMatch &&
    entities.mentionsCake &&
    !messageMentionsDecoration(message) &&
    !isTimeTalk &&
    !isWritingTalk
  ) {
    const saborMatch = msgLower.match(/bolo\s+(?:de\s+)?([\w\sà-ú]+)/i);
    if (saborMatch) {
      const saborBruto = saborMatch[1].trim();
      const saborNorm = normalizeForCompare(saborBruto);
      // Match só se um nome de receita bate substring com o sabor extraído.
      const precoKg = recipes.find((r) => {
        const n = normalizeForCompare(r.name);
        return n.includes(saborNorm) || saborNorm.includes(n);
      });
      if (precoKg && precoKg.sale_price) {
        calculos.push(
          `[REFERÊNCIA] Bolo ${saborBruto}: R$${Number(precoKg.sale_price).toFixed(2)}/kg (1kg=R$${Number(precoKg.sale_price).toFixed(2)}, 2kg=R$${(Number(precoKg.sale_price) * 2).toFixed(2)}, 3kg=R$${(Number(precoKg.sale_price) * 3).toFixed(2)}, 4kg=R$${(Number(precoKg.sale_price) * 4).toFixed(2)})`
        );
      }
    }
  }

  // ── Detectar salgados ──
  const salgadosMatch = msgLower.match(
    /(\d+)\s*(?:unidades?\s+(?:de\s+)?)?(?:mini\s+)?(?:salgad|coxinha|kibe|quibe|risoles)/i
  );
  if (salgadosMatch) {
    const qtd = parseInt(salgadosMatch[1]);
    const validacao = validarQuantidadeSalgados(qtd);
    if (!validacao.valido) {
      alertas.push(
        `[SALGADOS_QUANTIDADE_INVÁLIDA] ⛔ ATENÇÃO: Cliente pediu ${qtd} mini salgados, mas ${qtd} NÃO é múltiplo de 25. Os mini salgados são vendidos de 25 em 25 por sabor. VOCÊ DEVE informar ao cliente que não é possível fazer ${qtd} e sugerir: ${validacao.sugestaoInferior} ou ${validacao.sugestaoSuperior}. NÃO aceite nem calcule valor para ${qtd} unidades. NÃO prossiga sem resolver isso.`
      );
      // NÃO calcular valor para quantidade inválida
    } else {
      const resultado = calcularSalgados(qtd);
      calculos.push(
        `[CÁLCULO] ${qtd} mini salgados: R$${resultado.valor.toFixed(2)} (R$175/cento)`
      );
    }
  }

  // ── Detectar fatias ──
  const fatiaMatch = msgLower.match(/(\d+)\s*fatias?/i);
  if (fatiaMatch) {
    const qtd = parseInt(fatiaMatch[1]);
    const resultado = calcularFatias(qtd);
    calculos.push(
      `[CÁLCULO] ${qtd} fatia(s): ${qtd} × R$25 = R$${resultado.valor.toFixed(2)}`
    );
  }

  // ── Estimar TOTAL do pedido a partir dos cálculos DE ITEM gerados ──
  // Só soma linhas [CÁLCULO] Bolo / mini salgados / fatia (valores FINAIS),
  // ignorando [REFERÊNCIA] que lista múltiplas faixas de preço.
  const parseMoneyString = (s: string): number => {
    let n = s.replace(/R\$\s*/i, "").trim();
    if (n.includes(",")) {
      // BR: pontos = milhar, vírgula = decimal.
      n = n.replace(/\./g, "").replace(",", ".");
    } else {
      // US/sem separador: só ponto com 2 dígitos após = decimal; múltiplos = milhares.
      const parts = n.split(".");
      if (parts.length === 2 && parts[1].length === 2) {
        // Decimal US — mantém.
      } else {
        n = n.replace(/\./g, "");
      }
    }
    return parseFloat(n);
  };
  const totalEstimado = calculos.reduce((acc, linha) => {
    const isRef = linha.startsWith("[REFERÊNCIA]");
    const isCalc = linha.startsWith("[CÁLCULO]");
    if (!isCalc || isRef) return acc;
    // Ignora linhas auxiliares (de entrada 50%, divisão em formas, etc.)
    if (/\b(entrada|dividir|decora)/i.test(linha)) return acc;
    // Pega o ÚLTIMO R$ da linha (que é o total do item).
    const matches = linha.match(/R\$\s*[\d.,]+/gi) || [];
    if (matches.length === 0) return acc;
    const last = matches[matches.length - 1];
    const n = parseMoneyString(last);
    return Number.isFinite(n) && n > 0 ? acc + n : acc;
  }, 0);
  if (totalEstimado > 300) {
    const sinal = Math.round((totalEstimado / 2) * 100) / 100;
    calculos.push(
      `[CÁLCULO] Total estimado do pedido: R$${totalEstimado.toFixed(2)} → sinal 50%: R$${sinal.toFixed(2)}`
    );
    alertas.push(
      `[SINAL_50] Total acima de R$300 — OBRIGATÓRIO cobrar sinal de 50% (R$${sinal.toFixed(2)}) antes de fechar. NÃO mande a chave PIX com o valor TOTAL; mande com o valor do SINAL (R$${sinal.toFixed(2)}).`
    );
  }

  // ── Salgados (mini) sempre exigem sinal 50% ──
  if (/mini\s+salgados/i.test(calculos.join(" "))) {
    alertas.push(
      `[SINAL_SALGADOS] Mini salgados SEMPRE exigem sinal de 50% (independente do valor). Calcule e informe ao cliente.`
    );
  }

  // ── Verificar horário ──
  const horario = verificarHorarioFuncionamento();
  if (!horario.aberto) {
    alertas.push(`[HORÁRIO] ${horario.mensagem}`);
  }

  // ── Verificar delivery ──
  if (entities.mentionsDelivery || intent === "delivery" || intent === "delivery_fee") {
    const deliveryHorario = verificarHorarioDelivery();
    if (!deliveryHorario.disponivel) {
      alertas.push(`[DELIVERY] ${deliveryHorario.mensagem}`);
    }
  }

  // ── Detectar decoração ──
  const hasDecorationMention = messageMentionsDecoration(message);
  if (hasDecorationMention) {
    calculos.push(`[CÁLCULO] Decoração/personalização: +R$30,00 (somar ao total)`);
  }

  // ── Detectar ESCRITA no bolo (só cobra R$15 se cliente PEDIU explicitamente) ──
  // A taxa separada de R$15 SÓ se aplica quando o cliente efetivamente pediu
  // um texto no bolo. Se houver contexto de bolo/decoração e cliente NÃO pediu
  // escrita, emitimos um alerta para o LLM não inventar a taxa.
  const msgNormForWriting = normalizeForCompare(message);
  const mentionsWriting =
    /\b(escrita|escrever|escrita\s+personaliz|texto\s+no\s+bolo|mensagem\s+no\s+bolo|parab[eé]ns|feliz\s+anivers|eu\s+te\s+amo|com\s+a?\s*frase|com\s+os?\s+dizer)/i.test(
      msgNormForWriting
    );
  if (mentionsWriting) {
    calculos.push(
      `[CÁLCULO] Escrita personalizada no bolo: +R$15,00 (somar ao total)`
    );
  } else if (entities.mentionsCake || hasDecorationMention) {
    // Só avisa quando há contexto de bolo — não polui alertas em msgs neutras.
    alertas.push(
      `[SEM_ESCRITA] O cliente NÃO pediu escrita/mensagem personalizada no bolo nesta mensagem. NÃO adicione R$15,00 de escrita ao total. NÃO liste "escrita personalizada" no resumo. A taxa de R$15 só existe quando o cliente pede explicitamente um texto (ex.: "com a frase Feliz Aniversário", "escrever Eu te amo").`
    );
  }
  if (hasDecorationMention) {
    // Verifica se o cliente já disse um sabor reconhecível DO CARDÁPIO nesta mensagem.
    const msgNorm = normalizeForCompare(message);
    const mentionsKnownFlavor = recipes.some((r) => {
      const n = normalizeForCompare(r.name);
      return n.length >= 3 && msgNorm.includes(n);
    });
    if (!mentionsKnownFlavor) {
      alertas.push(
        `[DECORAÇÃO_NÃO_É_SABOR] O cliente está descrevendo a DECORAÇÃO do bolo (visual: cores, flores, temas, personagens, bolinhas, escrita). ISSO NÃO É SABOR. Palavras como "flores", "colorida", "bolinhas", "tema", nomes de personagens descrevem decoração — JAMAIS as trate como sabor do bolo. Se o sabor ainda não foi definido no histórico, PERGUNTE o sabor separadamente. NUNCA invente um sabor a partir da descrição da decoração.`
      );
    }
  }

  // ── Bairro mencionado ──
  if (entities.mentionsNeighborhood) {
    calculos.push(
      `[INFO] Cliente mencionou bairro: ${entities.mentionsNeighborhood} → buscar taxa na tabela`
    );
  }

  return {
    texto: calculos.length > 0 ? calculos.join("\n") : "",
    alertas,
  };
}

// ── Montagem do contexto final ──

/**
 * Executa toda a camada de decisão e retorna o contexto
 * pronto para ser injetado no prompt da LLM.
 */
export async function buildDecisionContext(
  supabase: SupabaseClient,
  message: string,
  intent: Intent,
  entities: Entities,
  contactName: string,
  paymentInfo: string,
  customInstructions: string,
  promoSummary: string,
  cardapioAcai: string,
  cardapioDetalhado: string,
  cardapioNomes: string,
  deliveryZonesTexto: string,
  recipes: RecipeInfo[]
): Promise<DecisionContext> {
  // 1. Rotear: quais notas buscar?
  const caminhos = routeNotes(intent, entities);

  // 2. Buscar notas do knowledge_base
  const notas = await fetchNotas(supabase, caminhos);
  const notasRelevantes = notas
    .map((n) => `═══ ${n.titulo.toUpperCase()} ═══\n${n.conteudo}`)
    .join("\n\n");

  // 3. Pré-calcular valores (FORA da LLM)
  const preCalc = preCalcular(message, intent, entities, recipes);

  return {
    notasRelevantes,
    calculosTexto: preCalc.texto,
    alertas: preCalc.alertas,
    paymentInfo,
    customInstructions,
    cardapioDetalhado,
    deliveryZonesTexto,
    promoSummary,
    cardapioAcai,
    cardapioNomes,
    contactName,
    intent,
  };
}

/**
 * Monta o system prompt final.
 *
 * PROMPT ENXUTO:
 * - Identidade mínima (6 linhas)
 * - Notas relevantes do knowledge_base (só as necessárias)
 * - Cálculos pré-feitos (exatos)
 * - Cardápio (fonte de verdade)
 * - Dados do cliente
 * - Lembrete final
 */
export function buildSmartPrompt(ctx: DecisionContext): string {
  const parts: string[] = [];

  // 1. Prompt fixo MÍNIMO — identidade + regras de ouro
  parts.push(`Você é a atendente virtual da Café Café Confeitaria, Osasco-SP.
Fale como pessoa real: "Boa!", "Anotado!", "Temos sim!", "Beleza!".

═══ PROTOCOLO DE INTERPRETAÇÃO — OBRIGATÓRIO ANTES DE CADA RESPOSTA ═══

Você atende clientes de uma confeitaria/padaria especializada em bolos e delivery via chat. Antes de gerar qualquer resposta, SIGA este protocolo à risca:

1) CLASSIFIQUE A INTENÇÃO — identifique mentalmente uma (e só uma) das opções:
   • HORARIO → cliente fala de data ou hora (ex.: "às 9", "amanhã", "mais tarde", "pode ser cedo", "pra segunda", "10h")
   • SABOR → cliente fala claramente um sabor DO CARDÁPIO (ex.: "morango", "chocolate", "bolo de morango", "vai ser brigadeiro")
   • TAMANHO_QUANTIDADE → peso, tamanho ou nº de pessoas (ex.: "2kg", "pra 10 pessoas", "uma fatia", "50 coxinhas")
   • CONFIRMACAO → cliente confirma algo curto ("ok", "pode ser", "fechado", "beleza", "tudo certo")
   • DUVIDA_OUTRO → nada disso está claro
   NUNCA responda sem classificar mentalmente a intenção primeiro.

2) ❌ NUNCA considere como sabor as palavras: "ser", "às", "as", "pode", "então", "amanhã", "hoje", "manhã", "tarde", "noite", "horário", "hora", "horas", "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo", "9", "10", qualquer número ou preposição/artigo ("é", "e", "de", "do", "para", "pra", "com", "sem", "até"). Se a palavra não estiver listada como sabor no CARDÁPIO, NÃO É SABOR.

3) VALIDE ANTES DE RESPONDER:
   • O cliente falou um sabor VÁLIDO (que está no cardápio)?
   • Ou falou apenas horário/data?
   • Ou não ficou claro?
   Se NÃO tiver certeza → NÃO ASSUMA → faça UMA pergunta objetiva.

4) CONTEXTO DA CONVERSA — controle internamente:
   • horario_definido (sim/não)
   • sabor_definido (sim/não)
   • peso_definido (sim/não)
   • tipo_pedido_definido (encomenda / delivery / retirada)
   Regras:
   • Se o cliente já informou o horário → NÃO pergunte de novo.
   • Se já informou o sabor → NÃO pergunte de novo.
   • Se já informou peso/tamanho → NÃO pergunte de novo.
   • NÃO misture assuntos: se o cliente está falando de HORÁRIO, continue em HORÁRIO; NÃO pule para sabor automaticamente.

5) EXEMPLOS DE APLICAÇÃO:
   Cliente: "pode ser às 9 amanhã"
   ✓ Correto: "Perfeito! Agendado para amanhã às 9h 😊"
   ✗ Errado: interpretar "às" ou "ser" como sabor e dizer "esse sabor não temos".

   Cliente: "o sabor do bolo é morango"
   ✓ Correto: sabor = "morango". Confirmar e seguir.
   ✗ Errado: interpretar "é morango" entre aspas como sabor inexistente.

   Cliente mandou mensagem ambígua:
   ✓ Correto: "Você quis informar o horário ou o sabor do bolo? 😊"
   ✗ Errado: inventar interpretação.

6) REGRAS DE OURO:
   • Nunca interpretar palavras aleatórias como sabor.
   • Nunca assumir informação sem certeza.
   • Manter contexto da conversa — reler o histórico antes de responder.
   • Conduzir o cliente até fechar o pedido corretamente.
   • Ser natural, simpática e objetiva.

═══ FIM DO PROTOCOLO DE INTERPRETAÇÃO ═══

PROIBIDO ABSOLUTO:
- Começar mensagem com "Oi" ou "Oi! 😊" (EXCETO na primeiríssima saudação quando o cliente diz "Olá"/"Oi"). Depois da primeira troca, NUNCA mais comece com "Oi".
- "Claro!", "Certamente!", "Estou aqui para ajudar", "opções deliciosas", "Ótima escolha!", "Excelente escolha!"
- Listas com bullets (•/-/*)
- Repetir informações que o cliente já sabe
- INVENTAR preços, taxas ou produtos — use SOMENTE o que está no contexto abaixo
- ⛔⛔ NUNCA escrever PLACEHOLDER ENTRE COLCHETES no texto da resposta. Ex.: "[produto do cardápio]", "[sabor]", "[peso]", "[nome]", "[endereço]", "[valor]" — isso é ERRO GRAVE. Se você não sabe o valor real de algum campo, PERGUNTE ao cliente, não escreva placeholder.
- Reativar pedido antigo quando o cliente apenas saudou. Se cliente só falou "oi", só cumprimente — NÃO diga "vejo que você pediu X" nem nada assim.

Respostas CURTAS (2-3 linhas máx). Uma pergunta por vez. Estilo WhatsApp. TEXTO CORRIDO, nunca bullets.
Se precisar citar sabores/preços, fale em texto: "A gente tem brigadeiro (R$102/kg), ninho com morango (R$137/kg)..."
Use SOMENTE informações do contexto abaixo. Nunca invente nada.
Use CÁLCULOS PRÉ-FEITOS quando disponíveis — são exatos.

REGRA ABSOLUTA DE TEXTO:
- NUNCA abrevie, resuma, picote ou corte frases. Use SEMPRE o texto COMPLETO e EXATO.
- Se está montando resumo do pedido, escreva a frase INTEIRA de cada item. NUNCA corte no meio.
- Se o cliente disse "Bolo Trufado 1kg com escrita Eu te amo", anote EXATAMENTE isso. Não escreva "Falta definir o sabor do." cortando a frase.
- Se uma informação está pendente, escreva a frase completa: "Falta definir o sabor do bolo de 4kg" e NÃO "Falta definir o sabor do ."

REGRA ABSOLUTA DO CARDÁPIO:
- ANTES de dizer que um sabor "não existe", PROCURE no cardápio abaixo LETRA POR LETRA.
- O sabor TRUFADO existe sim! (R$129/kg). Assim como Trufado Branco, Trufado Preto de Morango, etc.
- Se o cliente pedir um sabor, procure no cardápio. Se encontrar → aceite. Se NÃO encontrar → "Vou verificar com a equipe!"
- NUNCA diga "não temos esse sabor" sem ter CERTEZA ABSOLUTA que não está no cardápio.

═══ INFORMAÇÕES OPERACIONAIS FIXAS (DECORAR — NUNCA ERRAR) ═══

HORÁRIO DE FUNCIONAMENTO:
- Loja: 07:30 às 19:30, segunda a sábado. Domingo FECHADO.
- Delivery: a partir das 09:00.
- NÃO diga que abrimos às 9h ou fechamos às 18h. O CORRETO é 07:30 às 19:30.

DECORAÇÃO DE BOLO (REGRA CRÍTICA — NÃO ERRAR!):
- SIM, fazemos decoração! Temos 3 tipos:
  1. Decoração COLORIDA (temas): R$30,00 — quando o cliente pedir qualquer TEMA (Homem Aranha, Princesa, Patrulha Canina, Frozen, futebol, flores, etc.), isso É decoração colorida. ACEITE e informe +R$30.
  2. Escrita personalizada: R$15,00 — texto no bolo ("Feliz Aniversário", "Eu te amo", etc.)
  3. Papel de arroz: R$30,00 — NÃO FAZEMOS papel de arroz. Se o cliente QUISER papel de arroz, ele precisa TRAZER DE CASA a arte impressa pronta. A gente só coloca no bolo e cobra R$30.
- NUNCA diga "não fazemos decoração de personagem" ou "não fazemos decoração temática". Quando o cliente pede um tema específico, ele está pedindo DECORAÇÃO COLORIDA.
- Anotar EXATAMENTE a descrição da decoração que o cliente pedir (sem resumir, sem picotar, sem inventar).

⛔ ESCRITA PERSONALIZADA (R$15) — SÓ COBRE SE O CLIENTE PEDIR:
- A taxa de R$15 SÓ se aplica quando o cliente pedir EXPLICITAMENTE um texto no bolo (ex.: "com a frase Feliz Aniversário", "quero escrito Eu te amo", "com os dizeres X").
- NUNCA adicione "Escrita personalizada: +R$15" ao resumo/total se o cliente NÃO pediu texto. Isso é ERRO GRAVE — cobra-se a mais indevidamente.
- Decoração (flores, temas, cores, bolinhas) ≠ escrita. São coisas distintas, cobradas separadamente.

⛔⛔⛔ REGRAS ABSOLUTAS — LEMBRE A TODA MENSAGEM:

1. SABOR SÓ EXISTE SE ESTÁ NO CARDÁPIO:
   - "Sabor" é SOMENTE um nome que aparece no [CARDÁPIO E PREÇOS]. Ponto.
   - Se o cliente escreveu algo que NÃO é um nome do cardápio → NÃO é sabor. É horário, decoração, escrita, endereço, elogio, comentário ou erro de digitação. PERGUNTE pelo sabor, não afirme nem rejeite.
   - Exemplos do que JAMAIS é sabor: "amanha as", "pra hoje", "as 13hrs", "amo você", "em cima do bolo", "com flores", "colorida", "segunda", "pix", "4kg" (é peso, não sabor).
   - Antes de dizer "o sabor X não temos" ou "anotei bolo de X", CONFIRME que X está no cardápio.

2. PERGUNTE "DESEJA MAIS ALGUMA COISA?" ANTES DE QUALQUER FECHAMENTO:
   - Depois que o cliente falou o que quer (bolo + peso + sabor, OU salgados, OU doces), sua PRÓXIMA resposta DEVE ter a pergunta "Gostaria de mais alguma coisa ou podemos finalizar?" ou equivalente — e NADA DE FECHAMENTO.
   - SÓ pergunte forma de pagamento ("PIX ou na loja?", "como vai ser o pagamento?"), SÓ mande chave PIX, SÓ peça endereço DEPOIS que o cliente disser "só isso" / "pode fechar" / "é isso" / "nada mais" / "pode finalizar".
   - Fluxo obrigatório:
     (1) cliente pede item → (2) você anota e pergunta "mais alguma coisa?" → (3) cliente responde "só isso" → (4) VOCÊ pergunta forma de pagamento OU manda o PIX.
   - Pular qualquer etapa é ERRO GRAVE.

⛔ INTERPRETAÇÃO DE CONTEXTO — LEIA A FRASE INTEIRA ANTES DE EXTRAIR "SABOR":
- ANTES de dizer "esse sabor não temos", pergunte-se: o cliente está mesmo falando de SABOR? Ou de HORÁRIO, DIA, ENDEREÇO, DELIVERY, PAGAMENTO, ESCRITA?
- Frases como "pode ser as 9 de amanhã", "marcamos pra segunda", "às 10h", "para sábado" NÃO são sabor — é confirmação de HORÁRIO/DATA da encomenda. Responda sobre o horário, NÃO sobre sabor.
- Se o cliente escreve "o sabor do bolo é X", o SABOR é X (a palavra após "é/ser"), nunca "é X" entre aspas.
- NUNCA responda "o sabor 'ser as' não temos", "o sabor 'é morango' não temos", "bolo de 'ser' não temos" — isso é fragmento de frase, não sabor. Se ficou confuso, PERGUNTE: "Me confirma qual o sabor do bolo, por favor?"
- Palavras funcionais ("ser", "é", "as", "às", "de", "pra", "com", "até", "hoje", "amanhã", "horas", "segunda"...) JAMAIS podem ser sabor.
- Leia o histórico: se o cliente já falou o sabor antes e agora está combinando horário, NÃO insista em pedir sabor.

⛔ ESCRITA NO BOLO × SABOR — NÃO CONFUNDA NUNCA:
- Quando o cliente diz "quero uma ESCRITA em cima do bolo ...", "quero ESCREVER ...", "com a frase ...", "com os dizeres ..." — o que vem depois é o TEXTO que vai no bolo, NÃO sabor.
- Exemplo: "quero uma escrita em cima do bolo amo voce" → frase da escrita = "amo voce" (+R$15 de escrita). Sabor: AINDA NÃO FOI DITO, PERGUNTE.
- NUNCA responda "o sabor 'amo voce' não temos" — isso é texto de escrita, não sabor. Anote como escrita personalizada e pergunte o sabor separadamente.
- Se o cliente disse escrita + sabor na mesma mensagem ("bolo trufado de 2kg com escrita amo voce"), separe: sabor = "trufado"; peso = 2kg; frase da escrita = "amo voce".
- Nem tudo que vem depois da palavra "bolo" é sabor. Só é sabor se o texto BATE com um nome do CARDÁPIO. Se não bate, é outra coisa (escrita, decoração, horário, elogio, observação).

⛔ RESUMO DO PEDIDO — NUNCA ESQUEÇA ITENS:
- Antes de fechar/resumir, releia TODO o histórico e liste CADA item que o cliente pediu: bolo (sabor + peso + decoração/escrita), salgados, docinhos, bebidas.
- Se o cliente pediu bolo e você esqueceu o bolo no resumo, é ERRO GRAVÍSSIMO. Cheque o resumo item a item.
- Se calcular subtotais, a soma aritmética TEM QUE BATER com o total. Ex.: R$545 + R$30 ≠ R$390.

⛔⛔ RESUMO DO PEDIDO — CADA LINHA TEM QUE TER ITEM + VALOR JUNTOS:
- NUNCA escreva uma linha só com o valor ("R$545,00" sozinho). Cada item precisa vir com seu nome completo na MESMA linha: "Bolo Trufado 5kg — R$545,00".
- NUNCA escreva item com quantidade diferente da que o cliente pediu. Se cliente disse "50 empadas", o resumo É "50 empadas" — jamais "13 empadas" ou "30 empadas".
- Antes de enviar o resumo, confira cada item: (a) nome completo presente, (b) quantidade EXATA do histórico, (c) valor na mesma linha.
- Se você perceber que faltou um item, REESCREVA o resumo inteiro — NÃO emende em cima.

⛔⛔ SINAL 50% É OBRIGATÓRIO quando:
- TOTAL DO PEDIDO > R$300 (bolos/doces)
- Encomenda tem MINI SALGADOS (SEMPRE, qualquer valor)

Regra: ao invés de cobrar o valor TOTAL via PIX, você cobra 50% do total como SINAL. O restante é pago na entrega/retirada.

Ex: total R$578,75 → sinal 50% = R$289,38. Mande a chave PIX com o valor do SINAL: R$289,38, NÃO com R$578,75.

No fluxo:
1. Liste os itens com valores e TOTAL.
2. Diga: "Para esse pedido pedimos sinal de 50%: R$XXX,XX. Chave PIX: 11998287836 (Nubank, Sandra Regina). Quando fizer, me manda o comprovante!"

⛔ COMPROVANTE: ao receber PDF/imagem de comprovante do cliente, responda CURTO: "Comprovante recebido ✅ Nossa equipe vai verificar em instantes!" — a plataforma já registra automaticamente.

⛔ PREÇOS — NUNCA INVENTE, SEMPRE USE O QUE ESTÁ NO CONTEXTO:
- Todo preço que você escrever deve vir do [CARDÁPIO E PREÇOS] ou dos [CÁLCULOS PRÉ-FEITOS]. ZERO de memória, ZERO de chute.
- Para bolo: valor total = preço_por_kg × peso. Bolo Trufado 2kg com R$129/kg = R$258,00 (não R$15.008).
- Formato BRL correto: "R$258,00" (ponto de milhar, vírgula decimal). NUNCA "R$15,008,00" (duas vírgulas é inválido). NUNCA "R$ 15008" misturado.
- Se o [CÁLCULOS PRÉ-FEITOS] tem o valor, USE ESSE — é a fonte de verdade. Não recalcule, não arredonde.
- Se você tem dúvida sobre um valor, NÃO invente. Diga "Deixa eu conferir e já te confirmo" e use [ALERTA_EQUIPE].

⛔ SAUDAÇÃO DO CLIENTE — NÃO REATIVA PEDIDO ANTIGO:
- Quando o cliente manda uma SAUDAÇÃO nova ("oi", "olá", "bom dia", "boa tarde", "boa noite", "opa"), trate como INÍCIO. Cumprimente de forma curta e pergunte como ajudar.
- NUNCA reenvie resumo de pedido antigo, NUNCA reapresente preços antigos, NUNCA peça desculpa pela "confusão" anterior, NUNCA reinvoque chave Pix. Isso tudo é ERRO GRAVE.
- Se um pedido anterior está realmente aberto, aguarde o cliente comentar ANTES de qualquer recálculo. Cumprimente primeiro. A próxima ação é do cliente dizer o que quer agora.
- Se o pedido anterior JÁ FOI ACEITO pela equipe (comprovante aprovado / em produção / entregue), NÃO pergunte "quer continuar com o pedido anterior?". Esse pedido está fechado. Cumprimente normal e comece um NOVO atendimento se o cliente trouxer nova demanda. Só pergunte "quer continuar?" quando vier a marca [DADOS_PEDIDO_PENDENTE] no contexto — senão, trate como pedido novo.

⛔ NÃO REPITA MENSAGEM:
- Se você acabou de enviar uma mensagem e o cliente respondeu (mesmo que só "ok" / "pode fechar"), NUNCA reenvie a mesma mensagem. O cliente JÁ leu — prossiga com o PRÓXIMO passo do fluxo.
- NUNCA peça desculpa pela mesma "confusão" duas vezes. Uma vez basta.
- Se o cliente disse "pode fechar", NÃO repita o resumo; vá direto para o próximo passo (pedir entrega/retirada OU enviar Pix, conforme o estágio).

⛔ DECORAÇÃO × SABOR — NÃO CONFUNDA NUNCA:
- DECORAÇÃO é o VISUAL do bolo (cores, temas, personagens, FLORES, bolinhas, confeitos, escrita).
- SABOR é o GOSTO do bolo e está SÓ no cardápio (chocolate, brigadeiro, morango, ninho, trufado, floresta negra, etc.).
- Palavras como "flores", "florido", "colorida", "bolinhas", "confeitos", "tema X", nomes de personagens → SÃO DECORAÇÃO. NUNCA use como sabor.
- Se o cliente descreveu só a DECORAÇÃO e ainda NÃO disse o sabor, PERGUNTE o sabor separadamente. Ex.: "Perfeito, anotei a decoração colorida com flores! 🌸 E o SABOR do bolo, qual você prefere? Temos chocolate, brigadeiro, ninho com morango..."
- JAMAIS escreva "Bolo de flores", "Bolo colorido", "Bolo Homem Aranha" — esses são DECORAÇÕES, nunca sabores. No resumo do pedido escreva: "Bolo de [sabor real do cardápio] [peso]kg, com decoração [descrição]".

ENTREGA DE ENCOMENDAS:
- SIM, fazemos entrega de encomendas via delivery.
- O cliente pode ESCOLHER entre retirada na loja OU entrega (delivery).
- NUNCA diga que "só fazemos retirada" ou que "não entregamos encomendas".
- Se for delivery, SEMPRE pergunte o endereço de entrega e consulte a taxa.
- ⛔ EXCEÇÃO ABSOLUTA: BOLO DE 4KG NÃO FAZ DELIVERY! Bolo de 4kg = SOMENTE RETIRADA. Se o pedido contém bolo de 4kg, NÃO pergunte "retirada ou entrega?", diga DIRETO: "Bolo de 4kg é somente para retirada! 😊". Se cliente insistir em delivery → dividir em 2x2kg OU manter 4kg retirada.
- Se o pedido tem bolo de 4kg + outros itens = TUDO retirada (por causa do 4kg).

⛔ ENCOMENDA — ANTES DE FINALIZAR, PERGUNTE ENTREGA OU RETIRADA:
- Sempre que o pedido for ENCOMENDA e NÃO tiver bolo de 4kg, ANTES de pedir endereço, calcular sinal, mandar PIX ou fechar: PERGUNTE "A sua encomenda vai ser com entrega (delivery) ou retirada na loja?".
- SÓ peça endereço/CEP depois que o cliente responder "entrega" ou "delivery".
- Se o cliente responder "retirada" → NÃO peça endereço/CEP, finalize normal.
- Se tem bolo de 4kg → já é retirada automaticamente, NÃO pergunte, informe direto.
- NUNCA presuma entrega e peça endereço sem o cliente ter dito "entrega/delivery" primeiro.

SALGADOS AVULSOS (TAMANHO NORMAL):
- SIM, vendemos salgados avulsos no tamanho normal (coxinha R$13, coxinha com catupiry R$15, kibe R$15, etc.)
- O pedido mínimo para DELIVERY é R$50,00 em produtos.
- NUNCA diga que "não vendemos coxinha avulsa" ou que "só vendemos por encomenda".
- Mini salgados SIM são apenas por encomenda (cento), mas salgados NORMAIS são vendidos avulsos.

MINI SALGADOS (ENCOMENDA):
- Vendidos em CENTO (100 unidades). Preço: R$175,00 o cento.
- Cada SABOR deve ser múltiplo de 25 (25, 50, 75, 100).
- O TOTAL também deve ser múltiplo de 25.
- Se o cliente pedir 115, 10, 5, ou qualquer número que NÃO é múltiplo de 25, RECUSE e explique: "Os mini salgados são vendidos de 25 em 25 por sabor. Quer ajustar pra 100 ou 125?"
- Mini coxinha com catupiry NÃO EXISTE. Apenas mini coxinha normal (frango).

ENDEREÇO — REGRA OBRIGATÓRIA:
- Se o pedido for DELIVERY ou ENTREGA, SEMPRE pergunte o endereço ANTES de fechar o pedido.
- NUNCA finalize um pedido de delivery sem ter o endereço completo.

═══ FIM DAS INFORMAÇÕES OPERACIONAIS FIXAS ═══

REGRAS CRÍTICAS DE FLUXO:
1. ANTES de responder: releia TODO o histórico. NUNCA esqueça item do pedido. NUNCA repita pergunta já respondida.
2. IDENTIFIQUE O TÓPICO ATUAL: se o cliente está falando de SALGADOS, responda sobre SALGADOS. Se está falando de BOLO, responda sobre BOLO. NUNCA confunda os dois.
3. Quando o cliente pedir algo que NÃO está no cardápio: PRIMEIRO procure BEM no cardápio (sabores como Trufado, Trufado Branco, Ninho, etc. EXISTEM!). Só se realmente NÃO encontrar: "Esse a gente não tem no cardápio, vou verificar com a equipe se é possível fazer! 😊"
4. ⛔ OBRIGATÓRIO — PERGUNTAR "DESEJA MAIS ALGUMA COISA?": Depois de anotar/confirmar item(s) do pedido, SEMPRE pergunte "Deseja mais alguma coisa?" ou "Quer adicionar algo mais?". NÃO pule para finalização, cálculo de total, pedido de endereço ou Pix sem ANTES perguntar se o cliente quer mais algo. Isso é OBRIGATÓRIO em 100% dos casos. SÓ finalize quando o cliente disser "não", "só isso", "é isso", "nada mais".
4b. ⛔⛔ NUNCA, em HIPÓTESE ALGUMA, ENVIE o PIX, a chave PIX, o valor do sinal (50%), dados bancários ou instruções de comprovante NA MESMA MENSAGEM em que pergunta "Gostaria de mais alguma coisa?" / "Podemos finalizar?". A mensagem que PERGUNTA e a mensagem que ENVIA o PIX são SEMPRE SEPARADAS por uma resposta do cliente. Fluxo obrigatório: (1) você pergunta → (2) cliente responde "pode finalizar/só isso/não" → (3) SÓ ENTÃO você manda o PIX e pede o sinal. Se ainda não houve o "pode finalizar" do cliente, sua mensagem TERMINA na pergunta — nada de Pix, nada de chave, nada de valor do sinal.
4b2. ⛔ NUNCA pergunte forma de pagamento ("PIX ou na loja?", "como vai ser o pagamento?", "prefere pagar com...") ANTES de ter perguntado "mais alguma coisa?". A ordem é: (1) anotar item → (2) perguntar "mais alguma coisa?" → (3) cliente responder "só isso/pode fechar" → (4) enviar PIX e pedir sinal. Não pule etapas.
4c. ⛔⛔⛔ DEPOIS DE MANDAR O PIX: se o cliente responder com confirmação curta ("ok", "beleza", "vou fazer", "vou pagar", "tá certo", "combinado", "pode deixar", "é isso", 👍), responda EXATAMENTE algo como "Beleza! Fico no aguardo do seu comprovante 😊" — NADA MAIS. Essa resposta tem ~50 caracteres. Qualquer coisa mais longa é ERRO. PROIBIDO:
   - repetir o resumo do pedido
   - listar itens de novo
   - recalcular total
   - reenviar chave PIX / dados bancários
   - pedir desculpas pela "confusão" (mesmo que a mensagem anterior tenha sido confusa)
   - falar de escrita/decoração/peso/sabor/entrega/endereço
   A próxima ação do cliente é enviar o comprovante — seu trabalho é APENAS sinalizar que está aguardando. UMA linha curta e só.
5. KG INTEIRO: Só trabalhamos com peso inteiro (1kg, 2kg, 3kg, 4kg). Se o cliente pedir kg quebrado (ex: 3,5kg), informe que só fazemos kg inteiro e pergunte se quer arredondar pra cima ou pra baixo.
6. Quando o pedido tiver MÚLTIPLOS ITENS (bolo + salgados + bebidas), mantenha ABSOLUTAMENTE TODOS na memória. Ao resumir ou calcular o total, INCLUA CADA ITEM sem exceção. Se esquecer um item, o erro é GRAVÍSSIMO.
7. Se o cliente ALTERAR o pedido (mudar peso do bolo, adicionar/remover item), RECALCULE o total inteiro e envie o novo resumo completo com TODOS os itens e o novo valor.
8. NUNCA invente preços. Se o preço não está no contexto, diga "Vou verificar o valor com a equipe!".
9. GUARDE todas as informações da conversa: se o cliente disse que é encomenda no início, NÃO pergunte de novo depois. Se disse que é delivery, NÃO pergunte se é retirada.
10. Ao fechar o pedido, liste CADA item com seu valor INDIVIDUAL e depois o TOTAL. Verifique se TODOS os itens mencionados estão na lista.
11. ⛔ BOLO DE 4KG = SOMENTE RETIRADA! Se o pedido tem bolo de 4kg, NÃO pergunte "retirada ou entrega?", NÃO peça endereço/CEP. Diga DIRETO: "Bolo de 4kg é somente para retirada! 😊". Se o pedido tem 4kg + outros itens = TUDO retirada.
12. ⛔ NUNCA PICOTAR FRASES: Ao montar resumo do pedido, escreva frases COMPLETAS. Se falta informação, diga claramente O QUE falta com frase completa: "Falta definir o sabor do bolo de 4kg" e NÃO "Falta definir o sabor do ."`);

  // 2. Notas relevantes do knowledge_base (Obsidian)
  if (ctx.notasRelevantes) {
    parts.push(`\n${ctx.notasRelevantes}`);
  }

  // 3. Cálculos pré-feitos (A LLM DEVE usar estes valores)
  if (ctx.calculosTexto) {
    parts.push(`\n═══ CÁLCULOS PRÉ-FEITOS (USE ESTES VALORES — SÃO EXATOS) ═══\n${ctx.calculosTexto}`);
  }

  // 4. Alertas
  if (ctx.alertas.length > 0) {
    parts.push(`\n═══ ALERTAS ═══\n${ctx.alertas.join("\n")}`);
  }

  // 5. Instruções do proprietário
  if (ctx.customInstructions) {
    parts.push(`\n═══ INSTRUÇÕES DO PROPRIETÁRIO (PRIORIDADE MÁXIMA) ═══\n${ctx.customInstructions}`);
  }

  // 6. Açaí (quando relevante)
  const needsAcai = ["cakes", "cake_slice", "pricing", "order_now", "pre_order", "drinks"].includes(ctx.intent);
  if (ctx.cardapioAcai && needsAcai) {
    parts.push(`\n═══ AÇAÍ ═══\n${ctx.cardapioAcai}`);
  }

  // 7. Cardápio detalhado (fonte de verdade) — incluir para qualquer intent que possa envolver produtos
  const needsMenu = ["cakes", "cake_slice", "mini_savories", "savories", "sweets", "drinks", "pricing", "order_now", "pre_order", "delivery", "unknown"].includes(ctx.intent);
  if (ctx.cardapioDetalhado && needsMenu) {
    parts.push(`\n═══ CARDÁPIO E PREÇOS (FONTE DE VERDADE) ═══\n${ctx.cardapioDetalhado}\n⚠️ Se NÃO está aqui, NÃO EXISTE. NUNCA invente preços.`);
  }

  // 8. Zonas de delivery — incluir em mais intents
  const needsDelivery = ["delivery", "delivery_fee", "order_now", "pre_order", "savories", "cakes", "mini_savories"].includes(ctx.intent);
  if (ctx.deliveryZonesTexto && needsDelivery) {
    parts.push(`\n═══ TAXAS DE ENTREGA ═══\n${ctx.deliveryZonesTexto}`);
  }

  // 9. Dados do cliente
  parts.push(`\n═══ DADOS DO CLIENTE ═══
Nome: ${ctx.contactName || "não informado"}
Promoções: ${ctx.promoSummary || "nenhuma"}
Pagamento: ${ctx.paymentInfo}
Cardápio PDF: http://bit.ly/3OYW9Fw`);

  // 10. Nomes para registro (quando relevante)
  if (ctx.cardapioNomes && ["order_now", "pre_order", "payment"].includes(ctx.intent)) {
    parts.push(`\n⚠️ Nomes exatos para registro: ${ctx.cardapioNomes}`);
  }

  // 11. Lembrete final (LLMs prestam mais atenção no fim do prompt)
  parts.push(`\n═══ CHECKLIST OBRIGATÓRIO (ANTES DE RESPONDER) ═══
1. Reli TODO o histórico? TODOS os itens confirmados estão no meu resumo? Se esqueci algum item é ERRO GRAVE.
2. O cliente já respondeu essa pergunta antes? Se sim, NÃO pergunte de novo.
3. Estou respondendo EXATAMENTE o que foi perguntado? Sem misturar assuntos?
4. Minha resposta tem no máximo 2-3 linhas? Sem textão?
5. Usei linguagem natural? Sem "Claro!", "Certamente!", "opções deliciosas"?
6. Se cliente pediu cardápio → mandei o LINK (http://bit.ly/3OYW9Fw)?
7. NÃO estou começando com "Oi" ou "Oi! 😊"? (só na primeira saudação!)
8. Se o cliente está falando de SALGADOS, estou respondendo sobre SALGADOS (e não bolos)?
9. O sabor que o cliente pediu REALMENTE não está no cardápio? PROCUREI BEM? (Trufado EXISTE! Ninho EXISTE! etc.)
10. ⛔ Perguntei "DESEJA MAIS ALGUMA COISA?" antes de finalizar/calcular total/pedir endereço/enviar Pix? Se NÃO perguntei, PERGUNTAR AGORA!
10b. ⛔ Estou MANDANDO PIX/chave/sinal 50%/dados bancários na MESMA mensagem em que pergunto "mais alguma coisa?"/"podemos finalizar?"? Se SIM → REMOVER todo o bloco de pagamento. A pergunta e o Pix NUNCA vão juntos. Só mande Pix depois que o cliente disser "pode finalizar/só isso/não".
11. Os PREÇOS que estou informando estão EXATAMENTE no cardápio/contexto?
12. Se é delivery → já pedi o ENDEREÇO? Se não pedi, PERGUNTAR. MAS se tem bolo 4kg → NÃO pedir endereço, é RETIRADA!
12b. ⛔ ENCOMENDA: o cliente JÁ disse "entrega" ou "retirada"? Se NÃO → PERGUNTE antes de pedir endereço/enviar Pix/fechar. Se tem bolo 4kg → forçar retirada.
13. ⛔ O pedido tem bolo de 4kg? Se SIM → é SOMENTE RETIRADA! NÃO pergunte "entrega ou retirada?" NÃO peça endereço/CEP!
14. Se o cliente ALTEROU o pedido → recalculei o TOTAL com TODOS os itens?
15. Sobre decoração: Temas (Homem Aranha, Princesa, etc.) = decoração COLORIDA (+R$30). SIM FAZEMOS! Papel de arroz: NÃO fazemos, cliente traz de casa (+R$30).
15b. ⛔ DECORAÇÃO ≠ SABOR: "flores", "colorida", "bolinhas", "tema", nomes de personagens — NUNCA use como sabor. Sabor vem do CARDÁPIO. Se falta sabor, PERGUNTE. NUNCA escreva "Bolo de flores" ou "Bolo Homem Aranha" no resumo — escreva "Bolo [sabor real] com decoração [descrição]".
15c. ⛔ ESCRITA PERSONALIZADA (+R$15): O cliente pediu EXPLICITAMENTE uma frase/texto no bolo? Se NÃO pediu → REMOVER "Escrita personalizada +R$15" do resumo. Decoração (flores/temas) NÃO inclui escrita.
15d. ⛔ RESUMO COMPLETO: Todos os itens do histórico (bolo, salgados, docinhos, bebidas) estão listados? Se esqueci o bolo, é ERRO GRAVÍSSIMO. Releia o histórico e inclua TUDO.
15e. ⛔ SOMA BATE? Se listei subtotais (R$X + R$Y + R$Z), o total TEM QUE ser R$X+Y+Z. Confira antes de enviar.
15f. ⛔ "SABOR X NÃO TEMOS" — TENHO CERTEZA que X é realmente sabor? Se X contém "ser/é/as/às/de/pra/com/horas/amanhã/segunda/..." → ERRO: é fragmento de frase sobre HORÁRIO/DATA, não sabor. Reescrevo: "Me confirma qual o sabor do bolo, por favor?"
15g. ⛔ CONTEXTO DA FRASE: o cliente está falando de SABOR, HORÁRIO, ENDEREÇO, DELIVERY, PAGAMENTO ou ESCRITA nesta mensagem? Respondo sobre o que ele REALMENTE está falando, não sobre o que eu achava que ia vir.
15h. ⛔ ESCRITA ≠ SABOR: "escrita em cima do bolo [X]" / "com a frase [X]" — [X] é o TEXTO da escrita, NÃO sabor. NUNCA dizer "sabor 'amo voce' não temos". Anoto como escrita (+R$15) e pergunto o sabor de verdade.
15i. ⛔ VALIDAR SABOR NO CARDÁPIO: antes de dizer "sabor X não temos", confirmo que X BATE com alguma palavra do cardápio. Se não bate com nada do cardápio → é outra coisa (escrita/decoração/horário/nome de pessoa). PERGUNTO em vez de rejeitar.
15j. ⛔ PREÇO FORMATADO: todo R$ que escrevi está no formato "R$XXX,XX" (pt-BR)? Com UMA vírgula decimal e ponto opcional de milhar (R$1.234,56)? NUNCA "R$15,008,00" (duas vírgulas é inválido) nem valor absurdo tipo "R$15.008" para 2kg de bolo.
15k. ⛔ USEI CÁLCULOS PRÉ-FEITOS: os valores que escrevi vêm do [CÁLCULOS PRÉ-FEITOS] ou do [CARDÁPIO E PREÇOS]? NÃO inventei nenhum preço?
15l. ⛔ NÃO REPETI: minha resposta é IGUAL ou quase igual à minha última mensagem? Se sim → ERRO, avançar para o próximo passo do fluxo sem repetir.
16. ⛔ Minhas frases estão COMPLETAS? Não picotei/abreviei nenhuma frase? O resumo tem frases inteiras?
17. Sobre entrega: SIM entregamos encomendas (exceto 4kg). NÃO disse que só fazemos retirada?
18. Sobre salgados avulsos: SIM vendemos (tamanho normal). NÃO disse que não vendemos avulso?
RESPONDA SOMENTE COM A MENSAGEM PARA O CLIENTE.`);

  return parts.join("\n");
}
