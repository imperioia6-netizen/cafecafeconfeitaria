

# CRM Profissional — Upgrade Completo

Redesign total do CRM com dashboard executivo, detalhes expandidos de cliente, KPIs em tempo real e interface de nivel enterprise.

---

## Visao Geral das Melhorias

### 1. Dashboard de KPIs no Topo da Pagina CRM
Antes das abas, adicionar um painel de metricas executivas:
- **Total de Clientes** (ativos/inativos/novos com mini grafico)
- **Receita Acumulada** (soma de total_spent de todos os clientes)
- **Taxa de Retencao** (clientes ativos vs total)
- **Aniversarios Proximos** (proximo 7 dias)
- **Clientes em Risco** (30d+ sem compra)
- Layout: 5 cards horizontais com icones, numeros grandes em JetBrains Mono e mini-labels

### 2. CustomerCard Expandido com Drawer de Detalhes
O card atual e basico. O novo card tera:
- **Avatar com iniciais** do nome (circulo colorido baseado no status)
- **Barra de progresso** de engajamento (baseada em frequencia de compras)
- **Ultimo produto** comprado (nao so o favorito)
- **Tags visuais**: canal preferido, influenciador (se tiver seguidores alto)
- **Ao clicar**: abre um **Sheet/Drawer lateral** com:
  - Perfil completo do cliente
  - Historico de mensagens CRM enviadas
  - Historico de compras vinculadas
  - Botoes de acao: editar, enviar mensagem via n8n, registrar desconto influencia
  - Timeline visual das interacoes

### 3. CustomerForm com Edicao Inline
- O formulario atual so cria. Adicionar modo de edicao para clientes existentes
- Botao "Editar" dentro do drawer do cliente
- Pre-preencher campos com dados atuais
- Botao de deletar cliente com confirmacao (AlertDialog)

### 4. Aba Clientes Aprimorada
- **Contadores visuais** acima da lista: "12 Ativos | 3 Inativos | 5 Novos" como badges clicaveis
- **Ordenacao**: por nome, total gasto, ultima compra, data de cadastro
- **Vista em tabela** alternativa (toggle entre cards e tabela)
- **Estado vazio** com ilustracao e CTA mais claro

### 5. Aba Aniversarios Aprimorada
- **Calendario visual** no topo mostrando proximos 30 dias com pontos nos dias com aniversarios
- **Separacao por semana**: "Esta Semana", "Proxima Semana", "Este Mes"
- **Status do fluxo de 6 mensagens** por cliente (barra de progresso: 2/6 enviadas)
- **Botao de enviar todas** pendentes de uma vez via n8n

### 6. Aba Reativacao Aprimorada
- **Segmentacao visual**: 30-60 dias (amarelo), 60-90 dias (laranja), 90+ dias (vermelho)
- **Valor em risco** calculado (soma do total_spent dos inativos)
- **Historico de tentativas** de reativacao por cliente
- **Mensagem preview** antes de enviar via n8n
- **Botao "Reativar Todos"** para disparo em lote

### 7. Aba Social Seller Aprimorada
- **Funil visual com barras** proporcionais (nao so numeros em cards)
- **Taxa de conversao** entre cada estagio
- **Drag-and-drop** simulado com botoes para avancar lead no funil
- **Filtro por status** na lista de leads
- **Detalhes do lead** expandiveis

### 8. Aba Configuracoes Aprimorada
- **Status de conexao** visual: indicador verde/vermelho se o webhook esta ativo
- **Log de ultimas chamadas** ao n8n (ultimas 5 mensagens enviadas)
- **Secao de templates** de mensagem configuravel
- **Regras de influencia** mais detalhadas: faixas de seguidores com descontos diferentes

### 9. Integracao na Pagina de Vendas
- **Seletor de cliente** com combobox/search antes de finalizar venda
- Opcao "Cliente nao identificado" (padrao)
- Ao vincular, atualiza automaticamente `last_purchase_at` e `total_spent` do cliente

---

## Detalhes Tecnicos

### Novos Componentes
- `src/components/crm/CrmDashboardKpis.tsx` — Painel de KPIs executivos
- `src/components/crm/CustomerDetailSheet.tsx` — Drawer lateral com perfil completo, historico e acoes
- `src/components/crm/CustomerStatusBadges.tsx` — Badges clicaveis de status (contadores)

### Componentes Modificados
- `src/components/crm/CustomerCard.tsx` — Avatar com iniciais, barra de engajamento, mais dados visuais, onClick abre drawer
- `src/components/crm/CustomerForm.tsx` — Suporte a modo edicao (recebe customer opcional) + botao deletar
- `src/components/crm/BirthdayTimeline.tsx` — Separacao por semana, barra de progresso de fluxo 6 msgs, botao enviar todos
- `src/components/crm/ReactivationPanel.tsx` — Segmentacao por cores/gravidade, valor em risco, botao reativar todos
- `src/components/crm/SocialFunnel.tsx` — Funil visual proporcional, taxas de conversao, botoes avancar status, filtro
- `src/components/crm/N8nSettingsPanel.tsx` — Status de conexao visual, log de mensagens recentes
- `src/pages/Crm.tsx` — KPIs no topo, estado vazio melhorado, toggle cards/tabela, ordenacao
- `src/pages/Sales.tsx` — Combobox de selecao de cliente com busca

### Hooks Modificados
- `src/hooks/useCustomers.ts` — Adicionar parametros de ordenacao
- `src/hooks/useCrmMessages.ts` — Query por customer_id para historico no drawer

### Nenhuma alteracao de banco de dados necessaria
Todas as tabelas ja suportam as features. Os dados ja existem (crm_messages, customers, social_leads). Apenas a UI sera aprimorada.

---

## Sequencia de Implementacao

1. `CrmDashboardKpis` — KPIs executivos
2. `CustomerDetailSheet` — Drawer de detalhes do cliente
3. `CustomerCard` — Upgrade visual com avatar, engajamento, onClick
4. `CustomerForm` — Modo edicao + deletar
5. `Crm.tsx` — KPIs, ordenacao, toggle view, estados vazios
6. `BirthdayTimeline` — Separacao semanal, progresso do fluxo
7. `ReactivationPanel` — Segmentacao, valor em risco, lote
8. `SocialFunnel` — Funil proporcional, taxas, avancar status
9. `N8nSettingsPanel` — Status de conexao, log
10. `Sales.tsx` — Seletor de cliente com busca

Tudo mantendo o design cinematografico (glass-card, shine-effect, gradientes dourados, Playfair Display, JetBrains Mono para numeros).
