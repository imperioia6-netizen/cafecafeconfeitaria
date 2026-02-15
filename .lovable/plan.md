

# Padronizar fontes de icones e numeros nos KPIs

## Referencia

A imagem de exemplo mostra KPI cards com:
- Icones dentro de circulos arredondados (`rounded-xl`) com fundo suave
- Label do KPI ao lado do icone em fonte regular (sem uppercase, sem tracking exagerado)
- Texto "Hoje:" como sub-label discreto
- Numero principal grande, bold, com fonte monoespaçada (`JetBrains Mono`) e tracking mais aberto
- Linhas "7 dias:" e "30 dias:" com valores alinhados a direita, tambem em mono

## Componentes impactados

### 1. `src/pages/Index.tsx` - KpiCard (Dashboard)
- Ja esta proximo do visual correto
- Ajustar: icone com `rounded-xl` (quadrado arredondado) em vez de `rounded-full`
- Garantir `font-mono-numbers` no valor principal e nos valores de 7d/30d
- Tamanho do numero principal: `text-3xl` (ja esta)
- Label do titulo: `text-sm font-medium` sem uppercase (ja esta)

### 2. `src/components/cashregister/DayKpis.tsx`
- Atualmente usa layout horizontal (icone + texto lado a lado) diferente do padrao
- Refatorar para seguir o mesmo padrao visual dos KPIs do Dashboard:
  - Icone em quadrado arredondado + label ao lado
  - Valor principal em `font-mono-numbers text-2xl font-bold`
  - Sem linhas de 7d/30d (manter simples, so "Hoje")

### 3. `src/components/crm/CrmDashboardKpis.tsx`
- Atualmente usa `rounded-full` para icone - trocar para `rounded-xl`
- Label usa `text-[10px] uppercase tracking-widest` - trocar para `text-sm font-medium` sem uppercase
- Valor usa `text-2xl` - manter, garantir `font-mono-numbers`

### 4. `src/pages/Reports.tsx` - KPI cards do periodo
- Atualmente nao tem icone, so texto
- Adicionar icone correspondente (`DollarSign`, `ShoppingCart`, `TrendingUp`, `ArrowUpDown`)
- Padronizar com `rounded-xl` no container do icone
- Valor em `font-mono-numbers text-2xl font-bold`

## Detalhes tecnicos

Mudancas em cada arquivo:

**Index.tsx (KpiCard):**
- Linha 52: trocar `rounded-full` para `rounded-xl`
- Resto ja esta correto

**DayKpis.tsx:**
- Refatorar layout do card para vertical (icone+label no topo, valor embaixo)
- Icone: `rounded-xl p-2.5 bg-primary/10`
- Valor: `text-2xl font-bold font-mono-numbers`

**CrmDashboardKpis.tsx:**
- Linha 77: trocar `rounded-full` para `rounded-xl`
- Linha 80: trocar `text-[10px] uppercase tracking-widest` para `text-sm`
- Manter `font-mono-numbers` no valor (ja esta)

**Reports.tsx:**
- Adicionar icones aos KPI cards do periodo
- Usar mesmo padrao: `rounded-xl p-2.5 bg-primary/10` + icone
- Valor em `font-mono-numbers` (ja esta)

## Regra visual unificada

Todos os KPI cards seguirao:
- Container do icone: `rounded-xl p-2.5` com fundo suave
- Label: `text-sm font-medium` (sem uppercase forcado)
- Valor principal: `font-mono-numbers text-2xl md:text-3xl font-bold`
- Valores secundarios: `font-mono-numbers text-sm font-medium`

