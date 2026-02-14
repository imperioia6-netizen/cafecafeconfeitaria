

# Sistema de Fechamento de Caixa Aprimorado

## Resumo

Transformar o fechamento de caixa de uma tela basica em um sistema completo e profissional com: resumo financeiro em tempo real no card do caixa aberto, processo de fechamento com conferencia de valores, dashboard de KPIs do dia, filtros avancados no historico, e detalhamento expandivel por fechamento.

## Alteracoes

### 1. Cards de Caixas Abertos -- Resumo em Tempo Real

Cada card de caixa aberto passara a mostrar um resumo parcial das vendas vinculadas aquele caixa enquanto esta aberto:

```text
 Caixa 1                               [Aberto]
  Aberto as 08:30
  Troco: R$ 200.00
  --------------------------------
  12 vendas  |  R$ 1.450,00
  Pix: R$ 520   Credito: R$ 430   Dinheiro: R$ 500
  --------------------------------
  [Fechar Caixa]
```

Hook novo: `useRegisterSalesSummary(registerId, openedAt)` -- busca vendas do caixa e agrupa por forma de pagamento em tempo real.

### 2. Processo de Fechamento com Conferencia

Ao clicar "Fechar Caixa", abrir um Dialog (nao inline) com:

- Resumo automatico das vendas (total, qtd, por forma de pagamento)
- Campo "Valor contado em dinheiro" para conferencia (diferenca calculada automaticamente)
- Campo de observacoes
- Botao de confirmacao

```text
--- Fechar Caixa 1 ---

Resumo do Periodo:
  Vendas: 12     Total: R$ 1.450,00

  Pix:       R$ 520,00  (5 vendas)
  Credito:   R$ 430,00  (4 vendas)
  Dinheiro:  R$ 500,00  (3 vendas)

Conferencia de Dinheiro:
  Esperado: R$ 700,00  (troco + vendas em dinheiro)
  Contado:  [________]
  Diferenca: R$ -12,00  (falta)

Observacoes: [________________]

[Cancelar]  [Confirmar Fechamento]
```

Migracao: adicionar coluna `counted_cash` (numeric, nullable) e `cash_difference` (numeric, nullable) na tabela `cash_closings`.

### 3. Dashboard de KPIs do Dia

Acima dos cards de caixas abertos, uma faixa de KPIs do dia:

```text
[Faturamento Hoje]  [Total Vendas]  [Ticket Medio]  [Caixas Fechados]
   R$ 3.200,00          28            R$ 114,28            2
```

Hook: `useDaySummary()` -- agrega vendas do dia e fechamentos do dia.

### 4. Historico Aprimorado com Filtros

Substituir a timeline simples por uma secao com:

- **Filtro por data**: seletor de periodo (hoje, ontem, ultimos 7 dias, mes atual, personalizado)
- **Filtro por caixa**: Todos / Caixa 1 / Caixa 2 / Delivery
- **Cards expandiveis** ao inves de timeline -- cada fechamento e um card que pode ser expandido para ver detalhes completos
- **Quem abriu/fechou**: mostrar nome do operador que abriu e do que fechou o caixa (buscar na tabela profiles)

```text
Historico de Fechamentos
[Hoje v]  [Todos os Caixas v]

 Caixa 1 -- 14/02 18:30                    R$ 1.450,00
  12 vendas | Aberto por Maria | Fechado por Vitor
  Pix: R$ 520  Credito: R$ 430  Dinheiro: R$ 500
  Diferenca caixa: -R$ 12,00
  [v Expandir]
    > Obs: Faltou troco no final do turno
    > [Editar] [Excluir]   (owner only)
```

### 5. Detalhes Tecnicos

**Migracao SQL:**
```sql
ALTER TABLE cash_closings
  ADD COLUMN counted_cash numeric DEFAULT NULL,
  ADD COLUMN cash_difference numeric DEFAULT NULL;
```

**Hooks novos/modificados (`src/hooks/useCashRegister.ts`):**

- `useRegisterSalesSummary(registerId, openedAt)` -- busca vendas do caixa aberto e retorna totais por forma de pagamento
- `useDaySummary()` -- agrega faturamento do dia, ticket medio, quantidade de vendas e fechamentos
- `useClosingHistory(filters)` -- expandir para aceitar filtros de data e nome do caixa
- Modificar `useCloseRegister` para aceitar `counted_cash` e calcular `cash_difference`

**Componentes novos:**
- `ClosingDialog` -- dialog de fechamento com conferencia (extraido do inline atual)
- `ClosingCard` -- card expandivel para cada item do historico (substitui a timeline)
- `DayKpis` -- faixa de KPIs do dia

**Pagina (`src/pages/CashRegister.tsx`):**
- Layout reorganizado: KPIs no topo > Cards de caixas abertos > Historico com filtros
- Buscar perfis dos operadores (opened_by, closed_by) para exibir nomes
- Collapsible nos cards de historico para expandir detalhes

**Query de historico expandida:**
```
.select('*, cash_registers(name, opened_by, opening_balance, opened_at), closing_details(*), profiles!cash_closings_closed_by_fkey(name)')
```

Tambem buscar perfis dos `opened_by` dos registros via query separada (mesmo padrao usado em producoes).

