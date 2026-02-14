

# ☕ Café Café Confeitaria — Fase 1 + Fase 2: Base do Sistema + Controle de Produção

## FASE 1 — Base do Sistema

### 1.1 Autenticação e Perfis de Acesso
- Tela de login com email/senha via Supabase Auth
- 3 perfis de acesso com permissões diferentes:
  - **Dono (Felipe)**: acesso total a tudo — dashboard, financeiro, relatórios, configurações
  - **Funcionário (Caixa/Cozinha)**: registrar produção, peso, vendas, consultar estoque
  - **Cliente**: perfil futuro — cadastro preparado com campos para aniversário e familiar
- Tabela de perfis com nome, papel, telefone e foto
- Felipe pode cadastrar/gerenciar funcionários

### 1.2 Dashboard Executivo (Visão do Felipe)
- Painel principal com visual profissional, tema da marca Café Café (tons de marrom/café)
- Cards de resumo do dia:
  - Faturamento hoje
  - Quantidade de vendas (balcão + delivery)
  - Ticket médio
  - Estoque crítico (produtos com alerta)
- Gráfico de vendas dos últimos 7 dias
- Lista de alertas ativos (estoque baixo, produto parado >12h)
- Acesso rápido aos módulos: Produção, Estoque, Financeiro, CRM

---

## FASE 2 — Controle de Estoque e Produção

### 2.1 Cadastro de Receitas/Produtos
- Tela para cadastrar cada tipo de bolo/produto com:
  - Nome (ex: "Bolo de Chocolate")
  - Foto do produto
  - **Peso por fatia** (ex: 250g) — usado para calcular rendimento proporcional
  - **Preço de venda da fatia** — definido manualmente pelo Felipe
  - Categoria (bolo, torta, salgado, bebida, etc.)
- **Custo flexível — duas opções na mesma tela:**
  - **Opção 1 — Custo direto**: informar "Este bolo custa R$45 pra fazer"
  - **Opção 2 — Por ingredientes**: cadastrar ingredientes com preço e quantidade usada
  - O sistema calcula o custo por fatia e a margem de lucro automaticamente nos dois casos
- Campos calculados automaticamente (exibidos em tempo real):
  - Custo por fatia = custo total ÷ (peso total ÷ peso por fatia)
  - Margem por fatia = preço de venda − custo por fatia
  - Margem percentual

### 2.2 Registro de Produção (Tela do Funcionário)
- Interface simples e rápida para o funcionário usar no dia a dia:
  1. Selecionar o produto (ex: "Bolo de Chocolate")
  2. **Digitar o peso real que saiu** (ex: 3.2kg)
  3. O sistema calcula automaticamente:
     - Quantidade de fatias geradas (3200g ÷ 250g = 12.8 → 12 fatias)
     - Custo total desta produção
     - Custo e margem por fatia
  4. Confirmar e adicionar ao estoque
- Histórico de todas as produções com data, hora, operador e peso

### 2.3 Controle de Estoque em Tempo Real
- Painel mostrando todos os produtos com:
  - Quantidade disponível (fatias)
  - Hora da produção
  - Tempo no estoque (destaque visual se >12h)
  - Status: 🟢 Normal | 🟡 Atenção | 🔴 Crítico
- **Saída de estoque**: ao registrar uma venda (balcão ou delivery), desconta automaticamente
- **Cruzamento produção vs venda**: relatório mostrando se houve perda/divergência
- Definir estoque mínimo por produto — alerta quando atingir

### 2.4 Sistema Anti-Desperdício (Alerta >12h)
- Produtos no estoque há mais de 12 horas ganham destaque visual vermelho
- Opções de ação rápida:
  - Criar promoção automática (% de desconto)
  - Marcar como "destaque" (para futuro app/delivery)
  - Registrar descarte (com motivo)
- Registro de todas as ações para relatório de desperdício

### 2.5 Registro de Vendas (PDV Simples)
- Tela de venda rápida para o caixa:
  - Selecionar produto e quantidade
  - Canal: Balcão, Delivery ou iFood
  - Forma de pagamento: Pix, Crédito, Débito, Dinheiro, Refeição
  - Desconta automaticamente do estoque
- Preparação para integração futura com maquininha

---

## Banco de Dados (Supabase)
- Tabelas: perfis, receitas, ingredientes, produções, estoque, vendas, alertas
- RLS (Row Level Security) por perfil de acesso
- Edge Functions preparadas para webhooks do n8n (consulta de estoque, registro de pedido)

---

## Resultado Esperado desta Fase
- Felipe terá um dashboard profissional com visão completa do negócio
- Funcionários registram produção digitando o peso → sistema calcula tudo automaticamente
- Estoque atualiza em tempo real com cada venda
- Alertas automáticos de desperdício (>12h) e estoque crítico
- Base sólida para as próximas fases (Financeiro, CRM, Previsão de Demanda)

