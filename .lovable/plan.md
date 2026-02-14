

# Cafe Cafe — Plano Mestre de Evolucao

O Felipe pediu um sistema completo que transforma a confeitaria numa operacao inteligente e automatizada. Abaixo esta o mapa completo, organizado em fases que constroem uma sobre a outra.

## O que ja existe (Fases 1-2 — Prontas)

- Autenticacao com 3 perfis (Dono, Funcionario, Cliente)
- Dashboard executivo com KPIs reais
- Cadastro de receitas com calculo de custo e margem
- Registro de producao (peso na balanca gera fatias automaticamente)
- Estoque em tempo real com alerta de 12h
- PDV simples (balcao, delivery, iFood)
- Gestao de equipe
- Sistema de alertas

---

## FASE 3 — Controle Financeiro e Fechamento de Caixa

**Objetivo**: Felipe saber exatamente quanto entrou, por onde, e fechar o dia sem planilha.

### 3.1 Fechamento de Caixa
- Caixas independentes: Caixa 1, Caixa 2, Delivery
- Ao fechar, o sistema separa por forma de pagamento (Pix, Credito, Debito, Dinheiro, Refeicao)
- Resumo visual com totais por caixa e geral
- Historico de fechamentos anteriores

### 3.2 Relatorios Automaticos
- Relatorio semanal (7 dias), quinzenal (15 dias), mensal (30 dias)
- Comparacao com periodos anteriores (semana passada, mes passado)
- IA gera insights e sugestoes de melhoria baseado nos dados
- Envio automatico para o Felipe (via notificacao no app)

### 3.3 Cruzamento Producao vs Venda
- Relatorio mostrando: produziu X fatias, vendeu Y, sobrou Z
- Calculo de perda/desperdicio em R$ e percentual
- Historico para identificar padroes de gargalo

### 3.4 Balancete Inteligente
- Quanto eliminou de gasto (comparando periodos)
- Quanto lucrou a mais
- Estimativa de tempo economizado com automacao

**Banco de dados**: Novas tabelas `cash_registers`, `cash_closings`, `closing_details`

---

## FASE 4 — Lista de Compras e Fornecedores

**Objetivo**: O sistema diz o que comprar, quanto, e negocia o melhor preco.

### 4.1 Lista de Compras Inteligente
- Baseada no estoque atual + previsao de demanda para 7 dias
- Calcula quantidade necessaria de cada ingrediente
- Sugere quantidades otimizadas (evitar excesso e falta)

### 4.2 Cadastro de Fornecedores
- 5 fornecedores do Felipe + busca de 3 novos automaticamente
- Historico de precos por fornecedor e ingrediente
- Comparativo visual de precos

### 4.3 Cotacao e Pedido
- Sistema envia cotacao para multiplos fornecedores
- Compara respostas e sugere melhor opcao
- Gera pedido pendente (falta apenas pagamento)
- Notifica Felipe para aprovar

### 4.4 Negociacao Automatica (IA)
- Quando encontra preco mais barato em outro fornecedor
- IA gera mensagem para o fornecedor atual negociar
- Estilo: "Sou cliente ha tempo, encontrei preco melhor, pode cobrir?"

**Banco de dados**: Novas tabelas `suppliers`, `supplier_prices`, `purchase_orders`, `purchase_items`

---

## FASE 5 — Previsao Inteligente com IA

**Objetivo**: Saber o que vai vender antes de produzir.

### 5.1 Previsao de Demanda (7 dias)
- Analisa historico de vendas por dia da semana
- Cruza com previsao do tempo (API climatica)
- Sinaliza: "Hoje chuva a tarde — delivery sobe 40%, balcao cai 20%"
- Sugere quantidade de producao por produto

### 5.2 Integracao iFood (se API disponivel)
- Puxa dados de vendas do iFood
- Identifica padroes sazonais (inverno vende mais X, verao mais Y)
- Alimenta o motor de previsao

### 5.3 Sugestoes de Producao
- Todo dia de manha, o sistema sugere: "Produza X do bolo A, Y do bolo B"
- Baseado em historico + clima + dia da semana

**Tecnologia**: Edge Function com Lovable AI para analise + API de clima (OpenWeatherMap)

---

## FASE 6 — CRM e Marketing Automatizado

**Objetivo**: Transformar cada cliente em cliente recorrente.

### 6.1 CRM Padrao
- Cadastro de clientes com nome, telefone, aniversario, familiar proximo
- Historico de compras por cliente
- Segmentacao: ativo, inativo (30+ dias), novo

### 6.2 Funil Social Seller
- Novo seguidor recebe mensagem automatica
- Oferta de boas-vindas: "30% de cashback, pague 1kg leve 1.7kg"
- Cadencia de mensagens para converter em cliente

### 6.3 Campanhas de Aniversario
- 6 mensagens antes do aniversario do usuario
- 6 mensagens antes do aniversario do familiar
- Estilo: "Faltam 6 dias! Temos um bolo especial com promocao pra voce"
- IA sugere como organizar festa surpresa, cardapio, etc.

### 6.4 Reativacao de Inativos
- Cliente sem comprar ha 30 dias recebe mensagem personalizada
- "Sabe aquele bolo de morango com ninho que voce sempre pediu? 30% de desconto so pra voce"
- Oferta exclusiva (nao aparece na loja)

### 6.5 Upsell e Cross-sell com IA
- IA analisa: "80% dos clientes que pedem bolo X tambem pedem Y"
- Gera copy para vendedores oferecerem
- Incentiva Felipe: "Esses 40% extras nao estao entrando, vamos capturar?"

### 6.6 Pague com Influencia
- Cliente com X seguidores publica foto com tag
- Abate valor da comanda baseado no alcance

**Banco de dados**: Novas tabelas `customers`, `customer_orders`, `campaigns`, `campaign_messages`, `followups`

---

## FASE 7 — WhatsApp Bot e Atendimento

**Objetivo**: Atendimento 24h humanizado sem parecer robô.

### 7.1 Bot WhatsApp
- Recebe mensagem (texto ou audio)
- Responde de forma humanizada e natural
- Acessa estoque em tempo real para dar informacoes
- Acessa cozinha para dar previsao de entrega

### 7.2 Sistema de Pedidos via WhatsApp
- Cliente faz pedido pelo WhatsApp
- Bot confirma, verifica estoque, da prazo
- Avisa quando pronto
- Se nao da no prazo, sugere alternativa com 30% cashback

### 7.3 Sugestoes Inteligentes no Atendimento
- IA sugere ao atendente: "Este cliente gosta de X, ofereça Y"
- Copy pronta para cada situacao

**Tecnologia**: Edge Functions + Lovable AI + API WhatsApp Business (n8n webhook)

---

## FASE 8 — Social Media e Conteudo com IA

**Objetivo**: Gerar conteudo e postar automaticamente.

### 8.1 Banco de Fotos
- Upload e organizacao de fotos dos produtos
- Tags por produto e categoria

### 8.2 Criativo Automatico
- IA gera legenda + hashtags + copy
- Sugere melhores horarios para postar
- Preview antes de publicar

### 8.3 Automacao de Postagem
- Conecta com Instagram/Facebook
- Agenda e publica automaticamente

### 8.4 Mensageria IA (Social Media Vitor)
- IA gerencia respostas em DMs e comentarios
- Tom humanizado da marca

---

## FASE 9 — Conferencia por Foto e Acoes de Venda

### 9.1 Conferencia de Estoque via Camera
- Funcionario tira foto da vitrine/estoque
- IA identifica e conta produtos visiveis
- Compara com estoque no sistema
- Sinaliza divergencias

### 9.2 Sugestao de Acoes de Venda
- IA identifica oportunidades de mercado
- Sugere acoes: datas comemorativas, tendencias, clima
- Gera plano de acao com metas

---

## Prioridade de Implementacao Sugerida

| Ordem | Fase | Impacto | Complexidade |
|-------|------|---------|-------------|
| 1 | Fase 3 — Fechamento de Caixa e Relatorios | Alto | Media |
| 2 | Fase 4 — Lista de Compras e Fornecedores | Alto | Media |
| 3 | Fase 6 — CRM e Marketing | Alto | Alta |
| 4 | Fase 5 — Previsao com IA | Muito Alto | Alta |
| 5 | Fase 7 — WhatsApp Bot | Alto | Alta |
| 6 | Fase 8 — Social Media IA | Medio | Alta |
| 7 | Fase 9 — Conferencia por Foto | Medio | Muito Alta |

---

## Proximo Passo Concreto

Comecar pela **Fase 3 — Fechamento de Caixa**, que e o que mais impacta o dia a dia do Felipe agora:
1. Criar tabelas de caixas e fechamentos no banco
2. Tela de fechamento com separacao por forma de pagamento
3. Relatorio semanal comparativo com IA gerando insights
4. Cruzamento producao vs venda para detectar perdas

Cada fase seguinte sera construida sobre a anterior, garantindo que o sistema cresca de forma solida sem quebrar o que ja funciona.

