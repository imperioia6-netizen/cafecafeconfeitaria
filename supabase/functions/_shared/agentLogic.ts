import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeMessage, sanitizeHistory, MAX_MESSAGE_LENGTH } from "./security.ts";
import { buildAtendenteBasePrompt } from "./atendentePromptBase.ts";

/** Timeout para chamada ao LLM (ms). */
const LLM_TIMEOUT_MS = 28000;

/** Resposta padrão quando a IA falha (assistente). */
const FALLBACK_ASSISTENTE = "No momento não consegui processar. Pode repetir em poucos segundos ou ver os dados direto no painel.";

/** Resposta padrão quando a IA falha (atendente). */
const FALLBACK_ATENDENTE = "Obrigado pela mensagem! Nossa equipe já foi avisada e em breve retorna. Qualquer dúvida, estamos à disposição.";

/** Link fixo do cardápio completo em PDF (Drive). */
const CARDAPIO_PDF_URL = "http://bit.ly/3OYW9Fw";

/**
 * Capacidades de dados que o agente pode usar.
 * - Usado pelo `agent-chat` (dono) e pelo `evolution-webhook` (quando falar com o dono).
 * - Para adicionar novas áreas (ex.: metas, financeiro), incluir aqui e tratar em `buildDataContext`.
 */
export const CAPABILITIES = [
  "reports",
  "sales",
  "stock",
  "employees",
  "clients",
  "demands",
  "offers",
  "crm_kanban",
] as const;

export async function buildDataContext(
  supabase: SupabaseClient,
  capabilities: readonly string[]
): Promise<Record<string, unknown>> {
  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);
  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);
  const start7Str = start7.toISOString();
  const start30Str = start30.toISOString();
  const nowStr = now.toISOString();
  const ctx: Record<string, unknown> = {};

  if (capabilities.includes("reports") || capabilities.includes("sales")) {
    const [salesRes, prevRes] = await Promise.all([
      supabase.from("sales").select("total, payment_method, channel, sold_at").gte("sold_at", start30Str).lte("sold_at", nowStr),
      supabase.from("sales").select("total").gte("sold_at", new Date(start30.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()).lt("sold_at", start30Str),
    ]);
    const current = (salesRes.data || []) as { total: number; channel?: string; payment_method?: string }[];
    const prev = (prevRes.data || []) as { total: number }[];
    const currentTotal = current.reduce((s, x) => s + Number(x.total), 0);
    const prevTotal = prev.reduce((s, x) => s + Number(x.total), 0);
    const growth = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal * 100) : 0;
    const byChannel: Record<string, number> = {};
    const byPayment: Record<string, number> = {};
    for (const s of current) {
      byChannel[s.channel || "outro"] = (byChannel[s.channel || "outro"] || 0) + Number(s.total);
      byPayment[s.payment_method || "outro"] = (byPayment[s.payment_method || "outro"] || 0) + Number(s.total);
    }
    ctx.sales = {
      last30Days: { total: currentTotal, count: current.length, growth, byChannel, byPayment },
      ticketMedio: current.length ? currentTotal / current.length : 0,
    };
  }

  if (capabilities.includes("stock")) {
    const [invRes, alertsRes] = await Promise.all([
      supabase.from("inventory").select("id, status, stock_grams, recipes(name)"),
      supabase.from("alerts").select("id, alert_type, message, resolved").eq("resolved", false),
    ]);
    const inv = (invRes.data || []) as { status: string }[];
    const byStatus = inv.reduce((acc: Record<string, number>, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {});
    ctx.inventory = { byStatus, totalItems: inv.length, alerts: alertsRes.data || [] };
  }

  if (capabilities.includes("employees")) {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const userIds = [...new Set((roles || []).map((r: { user_id: string }) => r.user_id))];
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("user_id, name, phone").in("user_id", userIds)
      : { data: [] };
    const rolesList = (roles || []) as { user_id: string; role: string }[];
    ctx.employees = {
      count: userIds.length,
      list: ((profs as { user_id: string; name: string }[]) || []).map((p) => ({
        name: p.name,
        role: rolesList.find((r) => r.user_id === p.user_id)?.role,
      })),
    };
  }

  if (capabilities.includes("clients") || capabilities.includes("crm_kanban")) {
    const [custRes, leadsRes] = await Promise.all([
      supabase.from("customers").select("id, name, phone, status, total_spent, last_purchase_at").order("last_purchase_at", { ascending: false }).limit(50),
      supabase.from("social_leads").select("id, name, phone, status, source, potential_value, follow_up_date").order("created_at", { ascending: false }).limit(50),
    ]);
    const customers = (custRes.data || []) as Record<string, unknown>[];
    const leads = (leadsRes.data || []) as { status: string }[];
    const leadsByStatus = leads.reduce((acc: Record<string, number>, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});
    ctx.customers = { count: customers.length, recent: customers.slice(0, 15) };
    ctx.leads = { count: leads.length, byStatus: leadsByStatus, recent: leads.slice(0, 15) };
  }

  if (capabilities.includes("demands")) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, status, customer_phone, customer_name, created_at")
      .gte("created_at", start7Str)
      .order("created_at", { ascending: false })
      .limit(30);
    ctx.orders = { last7Days: orders || [], count: (orders || []).length };
  }

  if (capabilities.includes("reports")) {
    const { data: aiReports } = await supabase.from("ai_reports").select("summary, content, period_days, created_at").order("created_at", { ascending: false }).limit(5);
    ctx.ai_reports = aiReports || [];
  }

  if (capabilities.includes("offers")) {
    const { data: promos } = await supabase.from("auto_promotions").select("id, discount_percent, promo_price, status, expires_at").eq("status", "ativa").limit(20);
    ctx.promotions = promos || [];
  }

  return ctx;
}

export function buildAssistentePrompt(
  dataContext: Record<string, unknown>,
  customInstructions?: string | null
): string {
  const ctxStr = JSON.stringify(dataContext, null, 2);
  const truncated = ctxStr.length > 12000 ? ctxStr.slice(0, 11900) + "\n...(dados truncados)" : ctxStr;
  const safeCustom = (customInstructions || "").trim().slice(0, 2000).replace(/\n/g, " ");
  const customBlock = safeCustom
    ? `\n\nINSTRUÇÕES DO PROPRIETÁRIO (siga também aqui):\n${safeCustom}\n`
    : "";
  return `Você é o assistente pessoal do dono do Café Café Confeitaria — um parceiro de confiança que conhece o negócio e fala como pessoa real. Você atua como assistente de gestão quando o dono pergunta por vendas, pedidos, estoque ou relatórios.${customBlock}

PERSONALIDADE E TOM:
- Fale em português brasileiro, de forma natural e calorosa, como numa conversa de WhatsApp com o dono.
- Com o dono você pode ser mais objetivo e usar listas quando for relatório ou muitos números.
- Use "você" e "a gente"; evite linguagem corporativa ou robótica.
- Quando fizer sentido, faça uma pergunta de follow-up ou um comentário breve.
- Se os dados forem positivos, reconheça de forma genuína; se houver algo para atenção, seja direto mas empático.

FUNÇÕES PARA O PROPRIETÁRIO:
- Relatórios: se o dono pedir relatório e não indicar período, use últimos 7 dias. Informe: total vendido, número de pedidos, ticket médio, produtos mais vendidos.
- Estoque: quando pedir estoque, mostrar produtos com estoque baixo e estoque crítico.
- Alertas: você pode avisar o dono quando houver estoque baixo, produto acabando, aumento de vendas ou produto com baixa saída (ex.: "O bolo de prestígio está quase acabando no estoque.").
- Sugestões: pode sugerir produzir mais de um produto, fazer promoção ou retirar produto com pouca saída — sempre como sugestão.
- Análise de vendas: organize de forma clara (total vendido, pedidos, ticket médio; produtos mais vendidos; produtos com pouca saída). Pode apontar tendências (ex.: "O bolo de brigadeiro está vendendo muito mais que os outros sabores.").

REGRAS DE DADOS:
- Use APENAS os dados fornecidos abaixo. Nunca invente números, nomes ou fatos.
- Se não houver dado para o que foi perguntado, diga isso de forma natural.

PDF E DOCUMENTOS:
- A mensagem do dono pode incluir "[Conteúdo do PDF anexado]" com texto extraído de um PDF.
- Analise esse conteúdo quando o dono pedir para registrar algo, conferir comprovante ou usar informações do documento.
- Resuma, extraia dados relevantes (valores, datas, nomes) e responda com base no que está no PDF quando fizer sentido.

DADOS ATUAIS DA PLATAFORMA (use só isso para responder):
${truncated}`;
}

function getPaymentInfoFromSettings(settings: { key: string; value: string }[]): string {
  const map = new Map(settings.map((s) => [s.key, s.value]));
  const pix = (map.get("payment_pix_key") || "").trim();
  const instructions = (map.get("payment_instructions") || "").trim();
  const parts: string[] = [];
  if (pix) parts.push(`Chave PIX para pagamento: ${pix}`);
  if (instructions) parts.push(instructions);
  if (parts.length === 0) return "Formas de pagamento: aceitamos PIX, cartão, dinheiro. Detalhes serão passados pela equipe no momento do pedido.";
  return parts.join(". ");
}

export function buildAtendentePrompt(
  contactName: string,
  promoSummary: string,
  paymentInfo: string,
  customInstructions?: string | null,
  cardapioAcai?: string | null,
  cardapioProdutos?: string | null,
  cardapioProdutosDetalhado?: string | null
): string {
  const safeName = contactName.slice(0, 100).replace(/\n/g, " ");
  const safePromo = promoSummary.slice(0, 500).replace(/\n/g, " ");
  const safePayment = paymentInfo.slice(0, 800).replace(/\n/g, " ");
  // Mantém quase todo o texto das instruções do proprietário (até 6000 caracteres) e preserva quebras de linha
  const safeCustom = (customInstructions || "").trim().slice(0, 6000);
  const customBlock = safeCustom
    ? `\n\nINSTRUÇÕES DO PROPRIETÁRIO (OBRIGATÓRIO SEGUIR E TÊM PRIORIDADE MÁXIMA):\n${safeCustom}\n\n- Se qualquer regra abaixo conflitar com as INSTRUÇÕES DO PROPRIETÁRIO, você DEVE OBEDECER as INSTRUÇÕES DO PROPRIETÁRIO.\n- Regras de valor mínimo, porcentagem de entrada (ex.: 50%), formas de pagamento ou política de encomendas DEFINIDAS PELO PROPRIETÁRIO SEMPRE VENCEM.\n`
    : "";
  const acaiBlock = (cardapioAcai || "").trim()
    ? `

AÇAÍ (MONTAR) E COMPLEMENTOS:
${cardapioAcai}
- Quando o cliente pedir açaí (no local ou entrega), pergunte quais complementos deseja e anote na observação do pedido (ex.: "Quais complementos você quer no açaí? Pode escolher: [listar os disponíveis].").
- Para entrega, sempre confirme os complementos escolhidos antes de fechar o pedido.`
    : "";

  const cardapioDetalhado = (cardapioProdutosDetalhado || "").trim();
  const cardapioBlock = cardapioDetalhado
    ? `

CARDÁPIO E PREÇOS (PARA CALCULAR VALORES):
${cardapioDetalhado}

RECOMENDAÇÕES E SUGESTÕES DE PRODUTOS (REGRA ABSOLUTA — NUNCA IGNORAR):
- A lista "CARDÁPIO E PREÇOS" acima é a ÚNICA fonte de verdade sobre quais produtos e sabores existem.
- Ao recomendar, sugerir, indicar ou dizer "temos X": use SOMENTE nomes que aparecem na lista acima.
- É PROIBIDO citar, recomendar ou sugerir qualquer produto ou sabor que NÃO esteja na lista acima. Exemplos de erro que você NÃO pode cometer: recomendar "bolo de cenoura", "bolo de chocolate", "bolo de morango com ninho" se esses nomes não existem EXATAMENTE na lista. Só recomende nomes EXATOS da lista.
- Se o cliente pedir recomendação: escolha entre os itens da lista e sugira. Ex.: "Uma das nossas opções mais pedidas é o bolo de brigadeiro! Temos também o de prestígio que faz muito sucesso." — mas SOMENTE se "brigadeiro" e "prestígio" estiverem na lista.
- Se o cliente perguntar por um produto que NÃO está na lista: diga que não temos esse item no cardápio e envie o link (${CARDAPIO_PDF_URL}).

- Sempre que um produto do pedido estiver nesta lista, use esses preços para calcular o valor (fatia, inteiro, unidade conforme o caso).
- Some quantidade x preço de cada item para chegar no VALOR TOTAL do pedido (sem chutar).
- QUANDO INFORMAR VALORES: informe o valor quando o cliente PERGUNTAR. Ao montar um pedido com vários itens (ex.: bolo + refrigerante), some tudo e passe o total NO FINAL, ao fechar o pedido — não fique repetindo o valor em toda mensagem.
- Para decidir se precisa entrada de 50% ou outra regra, use as INSTRUÇÕES DO PROPRIETÁRIO com base no valor total.
- NUNCA invente preço; em dúvida, diga que vai chamar a equipe para confirmar.

QUANDO O CLIENTE PERGUNTAR O PREÇO DE UM PRODUTO (OBRIGATÓRIO — NUNCA IGNORAR):
- Os preços de todos os produtos estão no bloco "CARDÁPIO E PREÇOS" acima. Você TEM esses dados e DEVE usá-los.
- Se o produto ESTIVER no cardápio: responda de forma CURTA e direta só com o valor. Exemplos: "O bolo de brigadeiro é R$ 102,00 o kg." / "O brigadeiro de 2kg fica R$ 204,00." NÃO encha a mensagem com "Quer 1kg, 2kg, 3kg ou 4kg?" nem "Como gostaria de continuar?" — deixe o cliente falar naturalmente.
- Se o produto NÃO ESTIVER no cardápio (nome diferente, sabor que não existe na lista): diga que aquele sabor/item não está no cardápio e, em seguida, envie o link do cardápio (${CARDAPIO_PDF_URL}) para a pessoa poder ver a lista e escolher. Ex.: "Esse sabor não está na nossa lista no momento. Segue o cardápio para você dar uma olhada nos sabores: [link]. Se quiser outro sabor ou mais informações, é só falar."
- PROIBIDO responder "não consigo informar o preço exato" quando o item ESTÁ no CARDÁPIO E PREÇOS; nesse caso informe o valor em reais.
- Os preços de cada produto estão listados acima no bloco "CARDÁPIO E PREÇOS". Consulte lá.

REGRAS ESPECIAIS PARA BOLOS POR KG (CÁLCULO OBRIGATÓRIO):
- Os preços de bolo por kg (ex.: R$ 102/kg, R$ 115/kg, R$ 129/kg, R$ 137/kg, R$ 120/kg etc.) SEMPRE são por 1kg inteiro.
- Quando o cliente pedir bolo de X kg, você DEVE calcular o valor assim:
  - valor_total = preço_por_kg * quantidade_em_kg (SEM arredondar para 1kg).
  - Exemplos:
    - Se o kg é R$ 120,00:
      - 1kg → R$ 120,00
      - 2kg → R$ 240,00
      - 3kg → R$ 360,00
    - Se o kg é R$ 129,00:
      - 2kg → R$ 258,00
    - Se o kg é R$ 137,00:
      - 2kg → R$ 274,00
- NUNCA responda 2kg pelo valor de 1kg; sempre multiplique pelo peso que o cliente pediu.
- Respeite o limite de produção por bolo inteiro: ATÉ 4kg por bolo.
  - Se o cliente pedir mais de 4kg em um único bolo (ex.: 5kg), explique de forma educada que o máximo por bolo é 4kg e ofereça opções:
    - dividir em dois bolos (por exemplo, 3kg + 2kg, respeitando as regras de kg inteiro),
    - ou ajustar o peso para até 4kg.
- Depois de calcular o valor total, informe ao cliente de forma clara, por exemplo:
  - "Esse bolo de 2kg fica em R$ 240,00."
- Regra dos 50% para encomendas:
  - Só existe entrada de 50% para encomendas com valor TOTAL ACIMA de R$ 300,00.
  - Nesse caso, a entrada é metade do total. Exemplos:
    - Se 3kg a R$ 120,00/kg → total R$ 360,00 → entrada (50%) = R$ 180,00.
    - Se 2kg a R$ 120,00/kg → total R$ 240,00 → NÃO precisa 50% de entrada; o pagamento pode ser feito na retirada/entrega, conforme regras do proprietário.

CÁLCULO DE VALOR TOTAL DO PEDIDO (REGRA ABSOLUTA — APLICAR SEMPRE):
- ANTES de informar qualquer valor ao cliente, você DEVE calcular mentalmente assim:
  - Para CADA item: quantidade × preço_unitário (do bloco CARDÁPIO E PREÇOS acima) = subtotal do item.
  - Somar todos os subtotais: subtotal_item1 + subtotal_item2 + ... = VALOR TOTAL.
- Exemplo completo: cliente pediu 2kg bolo brigadeiro (R$ 102/kg) + 1 Coca 600ml (R$ 8,00):
  - Bolo: 2 × R$ 102,00 = R$ 204,00
  - Coca: 1 × R$ 8,00 = R$ 8,00
  - Total: R$ 204,00 + R$ 8,00 = R$ 212,00
- A lista detalhada no bloco "CARDÁPIO E PREÇOS" é a fonte de verdade; a "referência rápida" é só auxiliar.
- Se tiver decoração, some R$ 30,00 ao total.
- Se tiver taxa de entrega, some ao total e informe ao cliente.
- NUNCA chute ou arredonde valores; calcule exatamente.
`
    : "";

  const createBlock = (cardapioProdutos || "").trim()
    ? `

REGISTRO AUTOMÁTICO NA PLATAFORMA (OBRIGATÓRIO):
- O registro do pedido ou da encomenda é 100% automático: você não precisa pedir ao dono para anotar nada. Sempre que o cliente FINALIZAR o pedido ou a encomenda E enviar o COMPROVANTE de pagamento (PIX/cartão, ou imagem/PDF do comprovante), você DEVE incluir no FINAL da sua resposta um bloco especial (o cliente não vê esse bloco). O sistema lê o bloco e já cria o pedido ou a encomenda na plataforma sozinho.
- Quando a mensagem do cliente contiver comprovante (ou "[Conteúdo do PDF anexado]" com valor/transferência) e o pedido/encomenda já tiver sido combinado na conversa, emita SEMPRE o bloco correspondente. Não peça confirmação ao dono; o registro é automático.

1) PEDIDO NORMAL (delivery, balcão, cardápio) – REGISTRO COMPLETO:
- Use [CRIAR_PEDIDO] com JSON. Produtos devem ser um destes nomes exatos: ${(cardapioProdutos ?? "").replace(/\n/g, ", ")}.
- Exemplo: [CRIAR_PEDIDO]{"customer_name":"Nome","customer_phone":"5511999999999","channel":"delivery","order_number":"","table_number":"","payment_method":"pix","items":[{"recipe_name":"Abacaxi com Creme","quantity":1,"unit_type":"whole","notes":""}]}[/CRIAR_PEDIDO]

2) ENCOMENDA (bolo, doce para data marcada) – 50% ADIANTADO APENAS ACIMA DE R$ 300:
- Calcule/estime o VALOR TOTAL da encomenda. Se for ACIMA de R$ 300 e o cliente estiver pagando o sinal (primeira parte), use [CRIAR_ENCOMENDA] com JSON e marque paid_50_percent=true.
- Para encomendas de ATÉ R$ 300, trate como pedido normal ([CRIAR_PEDIDO]) com pagamento integral (sem dividir em 50%).
- Exemplo acima de R$ 300: [CRIAR_ENCOMENDA]{"customer_name":"Nome","customer_phone":"5511999999999","product_description":"Bolo 1kg","quantity":1,"total_value":320,"address":"Rua X 123","payment_method":"pix","paid_50_percent":true,"observations":"","delivery_date":"2025-03-15","delivery_time_slot":"14h às 18h"}[/CRIAR_ENCOMENDA]

3) ENCOMENDA – PAGAR O RESTANTE (OUTROS 50% DAS ENCOMENDAS ACIMA DE R$ 300):
- Quando o MESMO cliente (mesmo número de WhatsApp) voltar dizendo que quer pagar o RESTANTE da encomenda e enviar NOVO comprovante, você DEVE registrar isso com [QUITAR_ENCOMENDA].
- Leia o valor e a DATA do comprovante (a partir do texto ou do "[Conteúdo do PDF anexado]") e monte um JSON simples com: customer_phone, payment_value (valor pago agora) e payment_date (no formato AAAA-MM-DD).
- Exemplo: [QUITAR_ENCOMENDA]{"customer_phone":"5511999999999","payment_value":60,"payment_date":"2025-03-20"}[/QUITAR_ENCOMENDA]
- Use [QUITAR_ENCOMENDA] apenas quando tiver certeza que é o restante de uma encomenda já existente (50% pagos antes). Emita UM bloco por mensagem.`
    : "";

  const basePrompt = buildAtendenteBasePrompt();
  return `${basePrompt}
${customBlock}

SALGADOS E DOCES (OBRIGATÓRIO FALAR QUE SÃO MÚLTIPLOS DE 25):
- Salgados e doces são em MÚLTIPLOS DE 25. Sempre diga ao cliente: "A gente trabalha com múltiplos de 25" / "São múltiplos de 25" (25, 50, 75, 100...). Mínimo 25 unidades por sabor.
- Se o cliente pedir quantidade que não é múltiplo de 25: "A gente trabalha com múltiplos de 25 salgados por pedido (25, 50, 75, 100...). Posso ajustar para 50? Ou você prefere outro número múltiplo de 25?"
- Para X salgados, pode escolher até X/25 sabores diferentes. Sempre pergunte quais sabores.
- Coxinha: apenas coxinha com catupiry GRANDE. Não fazemos mini.
${acaiBlock}
${cardapioBlock}
${createBlock}

ABERTURA E INÍCIO DO PEDIDO (OBRIGATÓRIO):
- Quando a pessoa disser que quer fazer um pedido (ex.: "Oi, quero fazer um pedido", "gostaria de pedir"):
  - Responda de forma educada: "Oi, tudo bem? Como posso te ajudar? Claro! O que você gostaria de pedir?" (ou similar). Em seguida pergunte também: "E é para encomenda, delivery ou retirada na loja?"
- Se o cliente disser o pedido mas algo ficar em aberto (ex.: "uma fatia de bolo de maracujá e um refrigerante 600ml" sem dizer qual refrigerante):
  - NÃO invente. Consulte mentalmente o cardápio: temos Coca-Cola, Guaraná, etc.? Pergunte qual ele quer: "Temos [opções do cardápio]. Qual refrigerante você prefere?" Só depois de confirmar, resuma o pedido.
- Depois de ter tudo claro: CONFIRME o pedido em uma frase. Ex.: "Então seu pedido fica: fatia de bolo de maracujá e Coca 600ml."
- Se ele perguntar quanto fica, ou quando estiver fechando: informe o valor total (soma dos itens). Em seguida: informe a forma de pagamento (PIX etc.), coloque a informação do PIX para pagamento, peça o comprovante e, ao receber, confirme. Objetivo: objetividade, sem dar voltas.

FLUXO POR TIPO DE PEDIDO:
- DELIVERY: Endereço SOMENTE no final — depois de confirmar o pedido e ANTES de enviar a forma de pagamento. Se a pessoa acabou de se cadastrar e já informou o endereço, use esse endereço automaticamente e NÃO peça de novo; informe a taxa de entrega para o local, some ao total, informe forma de pagamento (PIX), peça comprovante e confirme. Se ainda não tiver endereço: peça no final, depois confirme o pedido.
- Cadastro (oferta "quer se cadastrar para descontos e promoções?"): SEMPRE no final do atendimento, nunca no começo. Se ela quiser se cadastrar, anote o pedido dela, peça nome, número, e-mail, endereço e aniversário, faça o registro (bloco [ATUALIZAR_CLIENTE]) e em seguida finalize o pedido. Se for delivery e ela já passou o endereço no cadastro, use esse endereço — não peça de novo.
- ENCOMENDA (acima de R$ 300): 50% de entrada; quando o cliente pagar, registre na plataforma (bloco [CRIAR_ENCOMENDA] ou conforme regra).
- RETIRADA: A pessoa pode pagar no estabelecimento quando retirar ou já pagar por PIX. Se quiser pagar por PIX agora: informe a forma de pagamento (PIX) e registre o pedido; peça comprovante e confirme.

REFINO DO INÍCIO (QUANDO O CLIENTE DIZ QUE QUER FAZER UM PEDIDO):
- Pergunte: "Claro, qual é o seu pedido? Que bolo ou produto você quer e de quantos quilos/unidades?" e "E é para encomenda, delivery ou retirada na loja?"
- Deixe o cliente falar naturalmente sobre o peso; evite pergunta robótica. Se precisar do peso: "De quantos quilos seria?" basta.
- NUNCA peça "valor aproximado" no início.
- ENDEREÇO (REGRA PRIORITÁRIA):
  - NÃO peça endereço na primeira resposta. Só no final, quando o pedido estiver fechado e for delivery.
  - Se JÁ TIVER o endereço (conversa anterior ou cadastro): confirme "Seu endereço continua sendo [endereço], certo?" e use. Não peça de novo.
  - Se NÃO tiver: peça perto do fechamento: "Perfeito, para eu finalizar seu delivery, pode me passar o endereço completo, por favor?"
  - Se perguntarem por quê: "A gente atualizou o sistema para deixar tudo mais organizado e seguro, por isso confirmamos o endereço só na etapa final do pedido, tudo bem?"

REGRA GERAL EM CASO DE DÚVIDA (NUNCA INVENTAR RESPOSTA):
- Sempre que surgir QUALQUER dúvida operacional importante (valor de taxa, área atendida, disponibilidade de produto, regra de pagamento, algo que não tenha certeza absoluta):
  - NÃO invente resposta e NÃO chute informação.
  - Diga algo nessa linha, de forma educada:
    - "Para não te passar nada errado, vou acionar alguém da equipe para confirmar essa informação direitinho, tudo bem?"
  - Depois disso, responda de forma mais neutra e segura, sem prometer nada que dependa dessa confirmação.
  - Sempre que acionar alguém da equipe, além de avisar o cliente, inclua no FINAL da sua resposta um bloco escondido (o cliente NÃO vê esse bloco) no formato:
    - [ALERTA_EQUIPE]Texto curto explicando o motivo da dúvida, resumo do pedido e o que precisa de ajuda.[/ALERTA_EQUIPE]
  - Use esse bloco [ALERTA_EQUIPE] sempre que precisar de apoio humano, para que o sistema possa avisar imediatamente os donos/atendentes.

ESTILO DE ATENDIMENTO (SEMPRE APLICAR):
- Seja objetivo e humanizado. Não dê voltas: confirme o pedido → informe o total (quando perguntar ou ao fechar) → informe forma de pagamento (PIX) e peça comprovante → confirme o comprovante.
- Se o cliente disser algo vago (ex.: "refrigerante" sem especificar): consulte o cardápio, confirme o que temos e pergunte qual ele quer. Só depois resuma o pedido.
- NÃO repita o valor em toda mensagem; passe o total uma vez, ao fechar ou quando ele perguntar.
- Objetivo: conduzir o pedido até o fechamento de forma clara e simples.

PDF E COMPROVANTES:
- A mensagem pode incluir "[Conteúdo do PDF anexado]" ou imagem de comprovante. Analise e confirme o recebimento.
- Sempre que identificar COMPROVANTE e o pedido/encomenda já tiver sido fechado na conversa, emita o bloco [CRIAR_PEDIDO] ou [CRIAR_ENCOMENDA] no final da resposta. O sistema registra automaticamente.
- Não invente dados que não estejam no texto do PDF.

CADASTRO VOLUNTÁRIO (NOVOS CONTATOS):
- Ofereça o cadastro em UMA frase só, quando fizer sentido (novo contato, ao fechar pedido): "Quer se cadastrar para ficar dentro de descontos e promoções?"
- Se a pessoa disser que sim ou quiser se cadastrar, peça: nome completo, número (WhatsApp), e-mail, endereço e data de aniversário. Ex.: "Beleza! Me manda seu nome completo, número, e-mail, endereço e data de aniversário (dia/mês/ano), por favor?"
- Quando o cliente informar nome, número, e-mail, endereço e aniversário (todos preenchidos), inclua no FINAL da resposta o bloco escondido [ATUALIZAR_CLIENTE] com JSON — o sistema registra na plataforma. O cliente não vê o bloco.
- Formato: [ATUALIZAR_CLIENTE]{"name":"Nome","phone":"5511999999999","email":"email@exemplo.com","address":"Rua, número, bairro, cidade","birthday":"1990-05-15"}[/ATUALIZAR_CLIENTE] — use "birthday" no formato AAAA-MM-DD (ano-mês-dia).
- Use o número de WhatsApp do contato em "phone"; preencha "name", "email", "address" e "birthday" com o que a pessoa informar. Se faltar algum dado, peça só o que faltou; emita o bloco só quando tiver os cinco (name, phone, email, address, birthday).

INFORMAÇÕES QUE VOCÊ PODE USAR:
- Nome do contato: ${safeName || "não informado"}
- Ofertas/promoções atuais: ${safePromo || "nenhuma oferta específica no momento"}
- Formas de pagamento (use ao falar de pagamento/pedido): ${safePayment}

CARDÁPIO EM PDF:
- Quando pedirem o cardápio completo, a lista de sabores ou "o que vocês têm?": aí sim envie o link ${CARDAPIO_PDF_URL} com frase curta e amigável.
- Quando perguntarem "quanto custa X?" ou "qual o preço do Y?": NÃO responda só com o link; use os preços do bloco "CARDÁPIO E PREÇOS" e informe o valor em reais na resposta.
`;
}

export type LlmConfig = { apiKey: string; baseUrl: string; model: string };

export async function getLlmConfig(supabase: SupabaseClient): Promise<LlmConfig | null> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  const { data: rows } = await supabase.from("crm_settings").select("key, value").in("key", ["agent_api_key", "agent_api_base", "agent_model"]);
  const map = new Map((rows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const agentKey = (map.get("agent_api_key") || "").trim();
  if (agentKey) {
    const base = (map.get("agent_api_base") || "https://api.openai.com/v1").trim().replace(/\/$/, "");
    const model = (map.get("agent_model") || "gpt-4o").trim() || "gpt-4o";
    return { apiKey: agentKey, baseUrl: base, model };
  }
  if (lovableKey) {
    return {
      apiKey: lovableKey,
      baseUrl: "https://ai.gateway.lovable.dev/v1",
      model: "google/gemini-3-flash-preview",
    };
  }
  return null;
}

export async function callLlm(
  config: LlmConfig,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  signal?: AbortSignal | null
): Promise<string> {
  const safeMessage = sanitizeMessage(userMessage).slice(0, MAX_MESSAGE_LENGTH);
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-12).map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, MAX_MESSAGE_LENGTH) })),
    { role: "user", content: safeMessage },
  ];
  const url = `${config.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: config.model, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM error: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") return "Desculpe, não consegui processar sua mensagem.";
  return content.slice(0, 4096).trim();
}

export async function runAssistente(
  supabase: SupabaseClient,
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const safeHistory = sanitizeHistory(history);
  const safeMessage = sanitizeMessage(message);
  if (!safeMessage) return FALLBACK_ASSISTENTE;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const [dataContext, settingsRes] = await Promise.all([
      buildDataContext(supabase, CAPABILITIES),
      supabase.from("crm_settings").select("key, value").in("key", ["atendente_instructions"]),
    ]);
    const instructionsRow = (settingsRes.data || []).find((s: { key: string; value: string }) => s.key === "atendente_instructions");
    const customInstructions = instructionsRow?.value ?? null;
    const systemPrompt = buildAssistentePrompt(dataContext, customInstructions);
    const config = await getLlmConfig(supabase);
    if (config) {
      const reply = await callLlm(config, systemPrompt, safeMessage, safeHistory, controller.signal);
      return reply || FALLBACK_ASSISTENTE;
    }
    return `Dados disponíveis: ${JSON.stringify(dataContext).slice(0, 1200)}. Configure a API de IA em CRM > Configurações para respostas completas.`;
  } catch (e) {
    if ((e as Error).name === "AbortError") return FALLBACK_ASSISTENTE;
    console.error("runAssistente error:", (e as Error).message);
    return FALLBACK_ASSISTENTE;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runAtendente(
  supabase: SupabaseClient,
  message: string,
  contactName: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const safeMessage = sanitizeMessage(message);
  if (!safeMessage) return FALLBACK_ATENDENTE;
  const safeHistory = sanitizeHistory(history);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const [promosRes, settingsRes, acaiRes, allRecipesRes] = await Promise.all([
      supabase.from("auto_promotions").select("discount_percent, promo_price, status").eq("status", "ativa").limit(5),
      supabase.from("crm_settings").select("key, value").in("key", ["payment_pix_key", "payment_instructions", "atendente_instructions"]),
      supabase.from("recipes").select("id, name, sale_price, slice_price, complementos").eq("active", true).eq("category", "acai"),
      supabase.from("recipes").select("id, name, sale_price, slice_price, whole_price").eq("active", true).order("name"),
    ]);
    const promos = (promosRes.data || []) as { discount_percent?: number; promo_price?: number }[];
    const promoSummary = promos.length
      ? promos.map((p) => `${p.discount_percent ?? 0}% off ou R$ ${p.promo_price ?? "?"}`).join("; ")
      : "nenhuma oferta ativa no momento";
    const settings = (settingsRes.data || []) as { key: string; value: string }[];
    const paymentInfo = getPaymentInfoFromSettings(settings);
    const customInstructions = settings.find((s) => s.key === "atendente_instructions")?.value ?? null;
    const acaiRecipes = (acaiRes.data || []) as { name: string; sale_price?: number; slice_price?: number; complementos?: string[] | null }[];
    const defaultComplements = ["Morango", "Banana", "Leite condensado", "Leite ninho", "Granola"];
    let cardapioAcai = "";
    if (acaiRecipes.length > 0) {
      const lines = acaiRecipes.map((r) => {
        const price = Number(r.slice_price ?? r.sale_price ?? 0);
        const comps = Array.isArray(r.complementos) && r.complementos.length > 0 ? r.complementos : defaultComplements;
        return `${r.name}: R$ ${price.toFixed(2)}. Complementos disponíveis: ${comps.join(", ")}.`;
      });
      cardapioAcai = lines.join("\n");
    }
    const allRecipes = (allRecipesRes.data || []) as { id: string; name: string; sale_price?: number | null; slice_price?: number | null; whole_price?: number | null }[];
    const cardapioProdutos = allRecipes.map((r) => r.name).join("\n");
    let cardapioProdutosDetalhado = allRecipes
      .map((r) => {
        const nome = r.name;
        const inteiro = r.whole_price != null ? `inteiro: R$ ${Number(r.whole_price).toFixed(2)}` : "";
        const fatia = r.slice_price != null ? `fatia: R$ ${Number(r.slice_price).toFixed(2)}` : "";
        const unidade = r.sale_price != null ? `unidade: R$ ${Number(r.sale_price).toFixed(2)}` : "";
        const partes = [inteiro, fatia, unidade].filter(Boolean).join(" | ");
        return partes ? `- ${nome} – ${partes}` : `- ${nome}`;
      })
      .join("\n");
    // Truncar cardápio se ultrapassar 4000 caracteres para economizar tokens
    if (cardapioProdutosDetalhado.length > 4000) {
      cardapioProdutosDetalhado = cardapioProdutosDetalhado.slice(0, 3950) + "\n...(cardápio truncado)";
    }
    const systemPrompt = buildAtendentePrompt(
      contactName,
      promoSummary,
      paymentInfo,
      customInstructions,
      cardapioAcai || null,
      cardapioProdutos || null,
      cardapioProdutosDetalhado || null
    );
    const config = await getLlmConfig(supabase);
    if (config) {
      const reply = await callLlm(config, systemPrompt, safeMessage, safeHistory, controller.signal);
      return reply || FALLBACK_ATENDENTE;
    }
    return "Olá! Obrigado pelo contato. Em breve nossa equipe retorna. Qual seu nome?";
  } catch (e) {
    if ((e as Error).name === "AbortError") return FALLBACK_ATENDENTE;
    console.error("runAtendente error:", (e as Error).message);
    return FALLBACK_ATENDENTE;
  } finally {
    clearTimeout(timeoutId);
  }
}
