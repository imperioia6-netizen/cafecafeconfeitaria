

# Upgrade da Fonte dos Numeros

## Analise

A imagem de referencia (2a foto) usa numeros com uma fonte sans-serif geometrica, limpa e moderna -- provavelmente **Inter** com `font-variant-numeric: tabular-nums`. Atualmente o app usa **JetBrains Mono** (monospace) para numeros, que tem um visual mais "developer" e menos premium.

## Mudanca

Trocar JetBrains Mono por **Inter** (peso 500-700) para todos os numeros, mantendo `tabular-nums` para alinhamento. Inter e a fonte mais usada em dashboards premium modernos e combina com o estilo da referencia.

## Arquivos Modificados

### 1. `src/index.css`

- No `@import` do Google Fonts, substituir `JetBrains Mono` por `Inter` com pesos 400, 500, 600, 700
- Na classe `.font-mono-numbers`, trocar `font-family` de `'JetBrains Mono', monospace` para `'Inter', sans-serif` e manter `font-variant-numeric: tabular-nums`
- Aumentar levemente o `letter-spacing` para `-0.02em` (tracking mais apertado como na referencia)

### 2. `src/pages/Index.tsx`

- No KpiCard, ajustar o valor "Hoje" para usar `font-semibold` ou `font-bold` com a nova fonte (sem mudanca de classe, apenas garantir que `font-mono-numbers` esta aplicado corretamente)
- Nos valores de 7d/30d, garantir consistencia com `font-mono-numbers`

### 3. `src/components/cashregister/DayKpis.tsx`

- Garantir que os valores usam `font-mono-numbers` consistentemente

### 4. `src/components/crm/CrmDashboardKpis.tsx`

- Mesma verificacao de consistencia

## Resultado

Numeros com visual limpo, geometrico e premium -- identico ao estilo da referencia. Sem fonte monospace, com tracking apertado e peso forte para autoridade visual.

