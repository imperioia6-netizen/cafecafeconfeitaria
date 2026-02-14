

# Ficha de Funcionario -- Media de Vendas e Nota de Atendimento

## Resumo

Ao clicar no card de um funcionario na pagina de Equipe, abrira um Sheet lateral (mesmo padrao do CustomerDetailSheet) exibindo a ficha completa com: dados pessoais, estatisticas de vendas (total, media diaria, ticket medio) e nota de atendimento editavel pelo Owner.

## Como vai funcionar

```text
--- Ficha do Funcionario ---

[Avatar]  Vitor
          Proprietario
          Tel: (11) 99999-9999
          Aniversario: 14 de fevereiro

-------------------------------
  DESEMPENHO DE VENDAS
-------------------------------
  Total de Vendas:       142
  Faturamento Total:     R$ 18.430
  Media por Dia:         R$ 614
  Ticket Medio:          R$ 129

-------------------------------
  NOTA DE ATENDIMENTO
-------------------------------
  [★ ★ ★ ★ ☆]  4.0 / 5.0
  (Owner pode clicar nas estrelas para alterar)

  Observacao: [ campo de texto ]
  [Salvar]
```

## Alteracoes

### 1. Migracao SQL

Adicionar colunas na tabela `profiles` para armazenar a nota de atendimento:

```sql
ALTER TABLE public.profiles
  ADD COLUMN service_rating numeric DEFAULT NULL,
  ADD COLUMN service_notes text DEFAULT NULL;
```

### 2. Hook (`src/hooks/useTeam.ts`)

- **`useEmployeeStats(userId)`**: busca vendas do funcionario (`sales` filtrado por `operator_id`), calcula total de vendas, faturamento total, media diaria e ticket medio
- **`useUpdateServiceRating`**: mutation para atualizar `service_rating` e `service_notes` no perfil

### 3. Componente novo: `src/components/team/EmployeeSheet.tsx`

Sheet lateral contendo:
- Dados pessoais (nome, telefone, aniversario, role)
- Secao de KPIs de vendas com 4 metricas em grid
- Sistema de estrelas clicavel (1-5) para nota de atendimento (editavel apenas pelo Owner)
- Campo de observacao com botao salvar
- Progress bar de engajamento baseado nas vendas

### 4. Pagina (`src/pages/Team.tsx`)

- Adicionar estado `selectedMember` para controlar qual funcionario esta selecionado
- Ao clicar no card, abrir o `EmployeeSheet`
- Cursor pointer nos cards para indicar que sao clicaveis

