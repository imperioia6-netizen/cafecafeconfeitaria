

# Implementacao Completa — Fase 1 + Fase 2

O banco de dados ja esta pronto. As paginas existem mas sao apenas esqueletos vazios. Vamos implementar toda a funcionalidade real.

---

## 1. Receitas (Cadastro Completo)

**Arquivo**: `src/pages/Recipes.tsx` + novos componentes

- Formulario de nova receita em Dialog/Sheet:
  - Nome, categoria (bolo/torta/salgado/bebida/doce/outro), foto (upload futuro, por ora texto)
  - Peso por fatia (g) — campo numerico
  - Preco de venda por fatia — campo monetario
  - Estoque minimo
- **Custo flexivel** com toggle entre dois modos:
  - **Custo direto**: campo simples "R$ quanto custa fazer"
  - **Por ingredientes**: adicionar ingredientes com quantidade, o sistema soma
- **Calculos em tempo real** exibidos na tela:
  - Custo por fatia
  - Margem por fatia (R$ e %)
- Lista de receitas cadastradas em cards/tabela com editar e desativar
- CRUD completo via Supabase (insert, update, select)

**Componentes novos**:
- `src/components/recipes/RecipeForm.tsx`
- `src/components/recipes/RecipeCard.tsx`
- `src/components/recipes/IngredientSelector.tsx`
- `src/components/recipes/CostCalculator.tsx`

---

## 2. Producao (Registro pelo Funcionario)

**Arquivo**: `src/pages/Production.tsx` + componentes

- Select para escolher receita ativa
- Campo para digitar peso produzido (em gramas ou kg com conversao)
- Calculos automaticos exibidos antes de confirmar:
  - Fatias geradas = peso / peso_por_fatia (arredonda para baixo)
  - Custo total desta producao
  - Custo por fatia e margem
- Botao "Confirmar Producao" que:
  - Insere na tabela `productions`
  - Insere na tabela `inventory` com `slices_available`
- Historico de producoes do dia em tabela abaixo

**Componentes novos**:
- `src/components/production/ProductionForm.tsx`
- `src/components/production/ProductionHistory.tsx`

---

## 3. Estoque (Tempo Real)

**Arquivo**: `src/pages/Inventory.tsx` + componentes

- Tabela/grid mostrando todos os itens no estoque:
  - Receita, fatias disponiveis, hora da producao
  - Tempo no estoque (calculado: agora - produced_at)
  - Status visual: verde (normal), amarelo (atencao >8h), vermelho (critico >12h)
- Filtros: por status, por receita
- Acoes rapidas para itens criticos (>12h):
  - Registrar descarte
  - Marcar acao tomada

**Componentes novos**:
- `src/components/inventory/InventoryTable.tsx`
- `src/components/inventory/StockStatusBadge.tsx`

---

## 4. Vendas (PDV Simples)

**Arquivo**: `src/pages/Sales.tsx` + componentes

- Selecionar produtos do estoque disponivel
- Definir quantidade de fatias
- Canal: Balcao / Delivery / iFood
- Pagamento: Pix / Credito / Debito / Dinheiro / Refeicao
- Ao confirmar:
  - Cria registro em `sales` e `sale_items`
  - Desconta `slices_available` do `inventory`
- Lista de vendas do dia abaixo

**Componentes novos**:
- `src/components/sales/SalesForm.tsx`
- `src/components/sales/SalesHistory.tsx`
- `src/components/sales/CartItem.tsx`

---

## 5. Alertas (Automaticos)

**Arquivo**: `src/pages/Alerts.tsx`

- Lista de alertas ativos vindos da tabela `alerts`
- Tipos: estoque baixo, validade >12h, desperdicio
- Acoes: resolver alerta, registrar acao tomada
- Badge no sidebar com contagem de alertas nao resolvidos

---

## 6. Equipe (Gestao de Funcionarios)

**Arquivo**: `src/pages/Team.tsx`

- Lista de usuarios com perfil e papel
- Formulario para convidar novo funcionario (criar conta + atribuir role)
- Editar perfil: nome, telefone, aniversario, familiar
- Apenas owner pode acessar

---

## 7. Dashboard (Dados Reais)

**Arquivo**: `src/pages/Index.tsx`

- KPIs com queries reais:
  - Faturamento hoje = soma de `sales.total` onde `sold_at` e hoje
  - Vendas hoje = count de `sales` de hoje
  - Ticket medio = faturamento / vendas
  - Estoque critico = count de `inventory` com status critico
- Grafico de vendas dos ultimos 7 dias usando Recharts
- Lista de alertas ativos
- Cards de acesso rapido com navegacao funcional

---

## 8. Hooks de Dados (React Query)

Criar hooks reutilizaveis para todas as queries:
- `src/hooks/useRecipes.ts` — CRUD receitas + ingredientes
- `src/hooks/useProductions.ts` — criar producao, historico
- `src/hooks/useInventory.ts` — listar estoque, atualizar
- `src/hooks/useSales.ts` — criar venda, historico
- `src/hooks/useAlerts.ts` — listar alertas, resolver
- `src/hooks/useTeam.ts` — listar membros, convidar
- `src/hooks/useDashboard.ts` — agregacoes para KPIs

---

## Detalhes Tecnicos

- Todas as queries via `@tanstack/react-query` com `useQuery` e `useMutation`
- Validacao de formularios com `zod` + `react-hook-form`
- Componentes UI usando shadcn/ui existentes (Dialog, Sheet, Select, Table, Badge)
- Calculos de fatias, custo e margem feitos no frontend em tempo real
- RLS ja configurado no banco — owner tem acesso total, employee pode criar producoes e vendas
- Nenhuma alteracao no banco de dados necessaria (schema ja esta completo)

---

## Ordem de Implementacao

1. Hooks de dados (base para tudo)
2. Receitas (primeiro modulo funcional — pre-requisito dos outros)
3. Producao (depende de receitas)
4. Estoque (depende de producao)
5. Vendas (depende de estoque)
6. Alertas
7. Equipe
8. Dashboard com dados reais

