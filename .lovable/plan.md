

# Dashboard Mobile -- Cards em Coluna Unica (Estilo Referencia)

## O que muda

A imagem de referencia mostra os KPI cards empilhados em **1 coluna** no mobile (full-width), com layout interno diferente do atual:

- Icone + Titulo na mesma linha (topo)
- "Hoje:" com valor grande abaixo
- Linha separadora horizontal
- "7 dias:" e "30 dias:" como linhas com menu "..." a direita

## Detalhes Tecnicos

### Arquivo: `src/pages/Index.tsx`

**1. Grid dos KPIs (linha 141)**
- De: `grid-cols-2 lg:grid-cols-4`
- Para: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

**2. KpiCard component (linhas 28-80)**
Reestruturar o layout interno para:
- Topo: icone + titulo
- "Hoje:" label + valor grande
- Divider horizontal (`border-t`)
- "7 dias:" com valor + icone MoreVertical
- "30 dias:" com valor + icone MoreVertical

Isso replica fielmente o estilo da imagem de referencia, onde cada card ocupa a largura toda da tela no mobile e mostra os dados de forma clara e organizada com separadores visuais.

