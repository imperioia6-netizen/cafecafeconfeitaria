-- Seed knowledge_base v2 — conteúdo real do vault Obsidian
-- Gerado a partir dos arquivos .md em /Obsidian Vault/
DELETE FROM public.knowledge_base;

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('admin/controle', 'Controle Interno', $c1$# Controle Interno

- Registrar todos os pedidos
- Validar pagamentos
- Conferir valores
- Conferir pedidos antes de finalizar$c1$, ARRAY['admin','controle','pedidos','validação']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('cardapio/bebidas', 'Bebidas', $c2$# Bebidas

## Refrigerantes
- Lata: R$8
- 600ml: R$13
- 2L: R$20

## Sucos
- Del Valle 1L: R$15
- Lata: R$7,50

## Naturais
- Laranja / Limão
- Pequeno: R$15
- Grande: R$25

## Outros
- Água: R$5
- Água com gás: R$6
- Água de coco: R$9
- Toddynho: R$6
- H2O: R$13$c2$, ARRAY['cardápio','bebidas','preços']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('cardapio/bolos', 'Bolos', $c3$# Bolos

## Regra geral

- Vendido por KG (inteiro)
- Não vendemos meio a meio
- Peso máximo por bolo: 4kg

## Acima de 4kg

- 5kg = 4kg + 1kg
- 6kg = 4kg + 2kg
- 8kg = 2 bolos de 4kg

---

# 💰 TABELA DE PREÇOS POR CATEGORIA

## R$102,00 / KG

- Brigadeiro
- Cocada
- Crocante
- Mousse de Limão
- Mousse de Maracujá
- Pêssego com Creme
- Prestígio

---

## R$115,00 / KG

- Abacaxi com Creme
- Ameixa com Doce de Leite
- Morango
- Bem Casado
- Abacaxi com Doce de Leite
- Bicho de Pé
- Brigadeiro com Mousse de Maracujá

---

## R$115,00 / KG (2ª linha)

- Casadinho
- Dois Amores
- Floresta Branca
- Floresta Negra
- Frutas
- Merengue
- Mousse de Chocolate
- Sonho de Valsa

---

## R$129,00 / KG

- Bicho de Pé com Brigadeiro
- Bicho de Pé com Morango
- Chocomix
- Maracujá com Coco
- Iogurte com Morango
- Limão com Chocolate
- Mousse de Chocolate Preto e Branco
- Mousse de Chocolate Branco

---

## R$129,00 / KG (2ª linha)

- Nozes
- Olho de Sogra
- Paçoca
- Alpes Suíço
- Beghui
- Ninho
- Ninho com Abacaxi

---

## R$129,00 / KG (3ª linha)

- Letícia
- Trufado
- Trufado Branco
- Delícia de Coco

---

## R$137,00 / KG

- Ninho com Morango
- Brigadeiro Branco
- Camafeu de Nozes
- Choconozes
- Café
- Ninho com Nutella
- Limão com Brigadeiro Branco
- Sonho de Morango
- Maracujá com Brigadeiro Branco
- Morango com Brigadeiro Branco

---

## R$137,00 / KG (2ª linha)

- Nutella com Brigadeiro Branco
- Trufado Preto de Morango
- Trufado Branco de Morango
- Trufado Branco e Preto
- Ouro Branco
- Ovomaltine
- Chocoberry

---

## R$137,00 / KG (3ª linha)

- Surpresa de Uva
- Trufado de Ninho
- Delícia de Mousse Branco
- Cappuccino
- Trufado com Crocante
- Duo (Brigadeiro branco e preto)
- Napolitano

---

## R$137,00 / KG (4ª linha)

- Choconinho
- Cherry Branco
- Cherry Preto
- Jufel
- Doce Tentação

---

## ⚠️ REGRAS IMPORTANTES

- Personalização: +R$30
- NÃO trabalhamos com papel de arroz
- Bolos com frutas → não recomendado ficar +24h

---

## 🍰 FATIAS

- Apenas do que estiver na vitrine
- Nunca confirmar sem verificar$c3$, ARRAY['cardápio','bolos','preços','sabores']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('cardapio/doces', 'Doces', $c4$# Doces

## Vendidos em cento

### R$190,00 (cento)

- Brigadeiro
- Beijinho
- Bicho de pé
- Olho de sogra

---

## Regras

- Pedido mínimo: cento
- Pode variar sabores$c4$, ARRAY['cardápio','doces','preços']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('cardapio/fatias', 'Fatias', $c5$# Fatias

## Regras

- Vendidas apenas do que está na vitrine (sempre consultar)
- Não fazemos fatia sob encomenda

---

## Resposta padrão

"Temos fatias sim, mas são apenas dos bolos disponíveis na vitrine no momento. Vou verificar quais temos hoje pra você 😊"$c5$, ARRAY['cardápio','fatias','vitrine']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('cardapio/mini-salgados', 'Mini Salgados', $c6$# Mini Salgados

## Regra principal

- Mesmos sabores dos salgados grandes
- EXCEÇÃO:
  ❌ NÃO tem coxinha com catupiry

✔️ Apenas coxinha normal (frango)

## Venda

- Vendido em CENTOS (100 unidades)

## Regra crítica

- Sabores devem ser múltiplos de 25

✔️ Correto:
- 25 coxinha
- 25 risoles
- 50 kibe

❌ ERRADO:
- 10 de um
- 5 de outro

## Como responder

"Os Mini salgados são vendidos em cento, e os sabores precisam ser escolhidos de 25 em 25, tudo bem?"$c6$, ARRAY['cardápio','salgados','mini','venda']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('cardapio/salgados', 'Salgados', $c7$# Salgados

## Tradicionais (R$13)
- Coxinha
- Risoles
- Bolinho de carne
- Esfiha carne
- Esfiha frango
- Esfiha calabresa
- 3 queijos
- Enroladinho
- Hamburgão

## Outros (R$15)
- Coxinha com catupiry
- Kibe
- Pão de batata

## Empadas (R$17)
- Palmito
- Frango com catupiry
- Carne seca
- 3 queijos

## Quiche (R$17)
- Brócolis
- Alho poró
- Queijo$c7$, ARRAY['cardápio','salgados','preços']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('fluxos/fluxo-delivery', 'Fluxo Delivery', $c8$# Fluxo Delivery

1. Confirmar produto
2. Confirmar endereço
3. Verificar taxa
4. Confirmar tempo estimado
5. Confirmar pagamento
6. Registrar pedido$c8$, ARRAY['fluxos','delivery','procedimento']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('fluxos/fluxo-encomenda', 'Fluxo de Encomenda', $c9$# Fluxo de Encomenda

1. Entender o pedido
2. Confirmar produto
3. Confirmar peso / quantidade
4. Confirmar data
5. Validar se está dentro do horário permitido
6. Confirmar forma de pagamento
7. Se acima de R$300 → pedir 50% antecipado
8. Confirmar todos os dados
9. Registrar na plataforma$c9$, ARRAY['fluxos','encomenda','procedimento']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('fluxos/fluxo-pedido-completo', 'Fluxo de Pedido', $c10$# Fluxo de Pedido

1. Entender pedido
2. Confirmar produto
3. Confirmar quantidade
4. Confirmar data/hora
5. Confirmar entrega, retirada ou encomenda
6. Confirmar pagamento
7. Resumir pedido
8. Registrar na plataforma$c10$, ARRAY['fluxos','pedido','procedimento']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('fluxos/fluxo-pix', 'Fluxo Pix', $c11$# Fluxo Pix

1. Informar chave Pix
2. Confirmar valor
3. Pedir comprovante
4. Validar pagamento na plataforma
5. Registrar pedido$c11$, ARRAY['fluxos','pix','pagamento','procedimento']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('fluxos/fluxo-retirada', 'Fluxo Retirada', $c12$# Fluxo Retirada

1. Confirmar produto
2. Confirmar horário
3. Perguntar forma de pagamento
4. Passar endereço
5. Registrar pedido$c12$, ARRAY['fluxos','retirada','procedimento']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('fluxos/fluxo-taxa', 'Fluxo de Taxa', $c13$# Fluxo de Taxa

1. Identificar endereço do cliente
2. Verificar bairro
3. Consultar tabela de taxas
4. Informar valor exato
5. Confirmar com cliente$c13$, ARRAY['fluxos','taxa','delivery']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('mapa-central', 'Mapa Central', $c14$# Mapa Central

## Sistema
- [[sistema/identidade-da-marca]]
- [[sistema/tom-de-voz]]
- [[sistema/regras-de-ouro]]

## Cardápio
- [[cardapio/bolos]]
- [[cardapio/bebidas]]
- [[cardapio/doces]]
- [[cardapio/mini-salgados]]
- [[cardapio/salgados]]

## Operação
- [[operacao/horarios]]
- [[operacao/encomenda]]
- [[operacao/delivery]]
- [[operacao/retirada]]
- [[operacao/pix]]
- [[operacao/formas-de-pagamento]]
- [[operacao/taxas]]

## Fluxos
- [[fluxos/fluxo-pedido-completo]]
- [[fluxos/fluxo-encomenda]]
- [[fluxos/fluxo-delivery]]
- [[fluxos/fluxo-retirada]]
- [[fluxos/fluxo-pix]]

## Restrições
- [[restricoes/produtos-que-nao-fazemos]]
- [[restricoes/erros-comuns]]

## Apoio
- [[memoria-operacional]]
- [[modelos/respostas]]
- [[vendas/estrategia]]
- [[admin/controle]]$c14$, ARRAY['mapa','índice','navegação']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('memoria-op/memoria-operacional', 'Memória Operacional', $c15$# Memória Operacional

## Usar para:

- Produtos em falta
- Avisos do dia
- Problemas temporários
- Mudanças no dia
- Problemas internos
- Avisos da equipe
## Regra

Sempre consultar antes de responder
⚠️ Sempre prioridade máxima

# Memória Operacional

## Atualizar diariamente

### Produtos indisponíveis
- (preencher)

### Alterações do dia
- (preencher)

### Avisos internos
- (preencher)

---

## Regra

Sempre consultar antes de responder cliente$c15$, ARRAY['memória','operacional','avisos']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('modelos/perguntas', 'Perguntas Obrigatórias', $c16$# Perguntas Obrigatórias

## Sempre perguntar:

- Qual produto?
- Quantidade?
- Data?
- Horário?
- Entrega ou retirada?
- pagamento

## Regra

Pedido não pode ser fechado sem essas respostas$c16$, ARRAY['modelos','perguntas','checklist']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('modelos/respostas', 'Respostas Padrão', $c17$# Respostas Padrão

## Verificar disponibilidade

"Vou verificar com a equipe quais temos disponíveis no momento, só um instante"

## Produto indisponível

"No momento não temos esse disponível, mas temos [sugestão]"

## Pedido fechado

"Pedido confirmado! Já registrei aqui pra você 👍"$c17$, ARRAY['modelos','respostas','atendimento']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('operacao/delivery', 'Delivery', $c18$# Delivery

## Regras

- Pedido mínimo: R$50
- Tempo: 30min a 1h
- Regiões: Osasco e proximidades

## Taxas

- Variam por bairro
- Sempre consultar tabela

## Regra crítica

- Nunca inventar taxa$c18$, ARRAY['operação','delivery','regras']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('operacao/encomenda', 'Encomenda', $c19$# Encomenda

## Regras

- Mínimo 4 horas de antecedência
- Só aceita pedidos até 12:00

## Após 12:00

- Recomendado: próximo dia após 12:00
- Se cliente insistir:
→ chamar responsável

## Fora do horário

- Sempre agendar para próximo dia útil após 12:00

## Intervalo

- Agendamentos com 40min de diferença

## Pagamento

- Acima de R$300:
  - 50% antecipado
  - 50% na entrega

## Regra importante

- Produtos com fruta NÃO armazenar +24h$c19$, ARRAY['operação','encomenda','regras']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('operacao/formas-de-pagamento', 'Formas de Pagamento', $c20$# Formas de Pagamento

## WhatsApp

- Pix
- Pagamento na entrega (delivery)

## Loja física

- Cartão
- Pix
- Dinheiro

## Regras

- Pedidos acima de R$300:
  - 50% antecipado
  - 50% na entrega

- Delivery:
  - mínimo R$50 em produtos$c20$, ARRAY['operação','pagamento','formas']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('operacao/horarios', 'Horário Operacional', $c21$# Horário Operacional

## Loja

- 07:30 às 19:30

## Delivery

- A partir das 09:00

## Encomendas

- Aceitas até 12:00 ou consultar

## Após 12:00

- Recomendado agendar para próximo dia após 12:00$c21$, ARRAY['operação','horários','funcionamento']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('operacao/pix', 'Pix', $c22$# Pix

## Chave
11998287836

## Banco
Nubank

## Nome
Sandra Regina

## Regra

- Sempre pedir comprovante$c22$, ARRAY['operação','pix','pagamento','chave']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('operacao/retirada', 'Retirada', $c23$# Retirada

- Cliente pode pagar no local ou Pix
- Sempre registrar pedido
- Passar endereço completo

## Endereço

Av. Santo Antônio, 2757 - Osasco$c23$, ARRAY['operação','retirada','endereço']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('operacao/status-pedido', 'Status do Pedido', $c24$# Status do Pedido

## Etapas

- Pedido recebido
- Pedido confirmado
- Em produção
- Saiu para entrega
- Finalizado

---

## Regra

Sempre informar status quando cliente perguntar$c24$, ARRAY['operação','status','pedido']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('operacao/taxas', 'Taxas de Entrega', $c25$# Taxas de Entrega

## ⚠️ REGRA CRÍTICA

ATENÇÃO:
Se a taxa for informada errada, será cobrada a diferença do atendente.
→ SEMPRE consultar a tabela em caso de dúvida.

---

# 📍 TABELA DE TAXAS

## Osasco

- 1º de Maio → R$ 20,00
- Adaldisa → R$ 15,00
- Ayrosa → R$ 20,00
- Baronesa → R$ 20,00
- Bonfim → R$ 20,00
- Bradesco Matriz → R$ 15,00
- Bussocaba → R$ 15,00
- Campesina → R$ 15,00
- Centro de Osasco → R$ 12,00
- Cidade das Flores → R$ 15,00
- Cirino → R$ 15,00
- Cipava → R$ 10,00
- Conceição → R$ 15,00
- Continental → R$ 15,00
- Helena Maria → R$ 20,00
- I.A.P.I → R$ 20,00
- VL Lageado → R$ 25,00
- Jardim Abril → R$ 15,00
- Jaguaribe → R$ 12,00
- Jardim Bandeiras → R$ 15,00
- Jardim Bela Vista → R$ 10,00
- Jardim Boa Vista → R$ 20,00
- Jardim das Flores → R$ 12,00
- Jardim Roberto → R$ 15,00
- Jardim Santa Maria → R$ 20,00
- Jardim Santo Antônio → R$ 15,00
- Jardim São Francisco → R$ 20,00
- Jardim São Pedro → R$ 15,00
- Km 18 → R$ 15,00
- Metalúrgicos → R$ 20,00
- Munhoz Júnior → R$ 20,00
- Novo Osasco → R$ 15,00
- Padroeira → R$ 15,00
- Pestana → R$ 15,00
- Piratininga → R$ 15,00
- Portal do Oeste → R$ 15,00
- Presidente Altino → R$ 15,00
- Quitaúna → R$ 15,00
- Rochdale → R$ 20,00
- Umuarama → R$ 15,00
- Veloso → R$ 15,00
- Vila Menck → R$ 20,00
- Vila Yara → R$ 15,00
- Vila Yolanda → R$ 10,00

---

## São Paulo

- Bonfiglioli →  (consultar)
- Jaguaré → R$ 20,00
- Lapa →  (consultar)
- Leopoldina → (consultar)
- Pinheiros → R$ 30,00
- Itaim Bibi → R$ 30,00
- Vila dos Remédios → R$ 20,00

---

## Barueri

- Alphaville → (consultar)
- Barueri → (consultar)
- Parque Imperial → (consultar)

---

## Carapicuíba

- Carapicuíba → (consultar)
- Mutinga (Carapicuíba) → (consultar)

---

## Outras regras

- Pedido mínimo para delivery: R$ 50,00
- Tempo médio: 30min a 1h

---

## Regra final

Se o bairro não estiver na lista:
→ CONSULTAR antes de informar$c25$, ARRAY['operação','taxas','delivery','bairros']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('restricoes/erros-comuns', 'Erros comuns', $c26$# Erros comuns

- Errar valor
- Errar soma
- Esquecer pedido
- Não registrar pedido
- Aceitar fora do horário

## Regra

Esses erros são inadmissíveis$c26$, ARRAY['restrições','erros','evitar']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('restricoes/produtos-que-nao-fazemos', 'Produtos que não fazemos', $c27$# Produtos que não fazemos

- Papel de arroz
- Mini coxinha com catupiry

- Não vende peso quebrado$c27$, ARRAY['restrições','produtos','não fazemos']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('sistema/excecoes', 'Exceções', $c28$# Exceções

## Cliente urgente

- Fora do horário ou prazo
→ chamar responsável

---

## Pedido grande

- Acima de R$300
→ exigir 50% antecipado

---

## Produto indisponível

→ sugerir alternativa

---

## Cliente insistindo fora da regra

→ não prometer
→ escalar para responsável$c28$, ARRAY['sistema','exceções','regras']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('sistema/fluxo-geral-atendimento', 'Fluxo Geral de Atendimento', $c29$# Fluxo Geral de Atendimento

## Ordem obrigatória

1. Entender o cliente
2. Identificar intenção:
   - informação
   - pedido
   - encomenda

3. Consultar:
   - cardápio
   - operação
   - restrições

4. Responder com clareza

5. Se for pedido:
   - seguir fluxo completo
   - registrar

## Regras

- Nunca pular etapas
- Nunca assumir informação
- Sempre validar antes de confirmar

## Situações especiais

### Cliente indeciso
→ sugerir opções

### Produto indisponível
→ oferecer alternativa

### Pedido urgente fora da regra
→ acionar responsável$c29$, ARRAY['sistema','fluxo','atendimento']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('sistema/horario-sistema', 'Horários', $c30$# Horários

## Funcionamento

- Segunda a Sábado
- 07:30 às 19:30

---

## Regras

- Fora desse horário:
  - NÃO atende pedidos imediatos
  - Apenas agendamento

---

## Domingo

- Não funciona$c30$, ARRAY['sistema','horários','funcionamento']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('sistema/identidade-da-marca', 'Identidade da Marca', $c31$# Identidade da Marca

## Nome
Cafe Cafe Confeitaria

## Localização
Av. Santo Antônio, 2757 - Vila Osasco, Osasco - SP

## Público
- Famílias
- Aniversários
- Encomendas
- Público premium

## Posicionamento
- Produtos de alta qualidade
- Bolos bem molhadinhos e generosos
- Salgados e lanches bem servidos
- Atendimento profissional

## Diferenciais
- Bolos extremamente saborosos e bem molhados
- Produtos frescos
- Variedade grande de opções
- Qualidade acima da média

## Comunicação
- Descontraída
- Profissional
- Clara
- Objetiva$c31$, ARRAY['sistema','marca','identidade']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('sistema/regras-de-ouro', 'Regras de Ouro', $c32$# Regras de Ouro

- Nunca inventar informação
- Nunca confirmar produto sem base
- Nunca errar valores
- Nunca errar soma de pedido
- Nunca aceitar pedido fora das regras

- Sempre registrar pedido na plataforma
- Sempre confirmar dados do cliente (ah menos que já tenha salvo)
- Sempre seguir fluxo correto

- Se não souber → verificar
- Se for urgente → acionar responsável

- Nunca esquecer pedido do cliente$c32$, ARRAY['sistema','regras','ouro']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('sistema/tom-de-voz', 'Tom de Voz', $c33$# Tom de Voz

## Estilo
- Humano
- Educado
- Profissional
- Levemente descontraído

## Regras
- Nunca parecer robô
- Nunca ser seco
- Nunca exagerar
- Sempre ser claro e direto

## Exemplos

✔️ "Consigo sim, vou te explicar certinho 😊"
✔️ "Temos essa opção sim, quer que eu te detalhe?"

❌ "Disponível."
❌ "Não temos."$c33$, ARRAY['sistema','tom','voz','comunicação']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('sistema/validacao-do-pedido', 'Validação de Pedido', $c34$# Validação de Pedido

## Antes de finalizar, SEMPRE confirmar:

- Produto(s)
- Quantidade
- Peso (se bolo)
- Sabor
- Data
- Horário
- Tipo (retirada ou delivery)
- Endereço (se delivery)
- Taxa de entrega
- Forma de pagamento
- Valor total

---

## Regra

Pedido só é finalizado após confirmação completa

---

## Exemplo

"Me confirma por favor:

- 1 bolo de 2kg sabor brigadeiro
- Entrega amanhã às 14:00
- Endereço: XXX
- Pagamento via Pix

Total: R$ XXX

Está tudo certo?"$c34$, ARRAY['sistema','validação','pedido','checklist']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('vendas/estrategia', 'Estratégia de Vendas', $c35$# Estratégia de Vendas

- Não forçar venda
- Ser leve
- Sugerir alternativas quando necessário
- Manter profissionalismo$c35$, ARRAY['vendas','estratégia']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('vendas/upsell', 'Upsell', $c36$# Upsell

## Quando aplicar

- Cliente está pedindo bolo
- Cliente está finalizando pedido

## Como fazer

"Quer incluir uma bebida pra acompanhar?"

"Esse aqui combina muito com suco natural, fica perfeito"

## Regra

- Sempre leve
- Nunca forçar$c36$, ARRAY['vendas','upsell','sugestões']);

INSERT INTO public.knowledge_base (caminho, titulo, conteudo, tags) VALUES
('fluxos/fluxo-cancelamento', 'Fluxo Cancelamento', $c38$# Fluxo — Cancelamento / Mudança de Ideia

## Cliente quer cancelar pedido em andamento

1. Confirmar se realmente quer cancelar: "Quer cancelar o pedido que a gente estava montando?"
2. Se confirmar → "Sem problemas! Se precisar de alguma coisa, é só chamar 😊"
3. Se não → retomar de onde parou

## Cliente quer recomeçar

1. "Beleza! Vamos do zero então 😊 O que vai querer?"
2. Não mencionar itens do pedido anterior
3. Tratar como conversa nova

## Cliente muda de ideia sobre um item

1. NÃO cancelar o pedido inteiro
2. Ajustar apenas o item mencionado
3. Repetir o resumo atualizado

---

## Regras

- Sempre confirmar antes de cancelar
- Nunca insistir se o cliente quer cancelar
- Se cancelou, NÃO perguntar "tem certeza?"
- Ser educada e rápida no processo$c38$, ARRAY['fluxos','cancelamento','mudança','pedido']);
