

# Corrigir Legibilidade dos Cards Marrons no Modo Escuro

## Problema

No modo escuro, a variavel `--primary-foreground` muda para `hsl(24 60% 10%)` (quase preto). Os cards marrons usam classes como `text-primary-foreground/90`, resultando em texto escuro sobre fundo escuro -- ilegivel.

O card marrom tem fundo fixo via inline style (`hsl(24 60% 20%)` a `hsl(24 50% 14%)`), que nao muda com o tema. Mas as classes de texto mudam, quebrando o contraste no dark mode.

## Solucao

Substituir todas as referencias a `text-primary-foreground` nos cards marrons (`isFirst`) por cores fixas claras que funcionam em ambos os temas, ja que o fundo desses cards e sempre escuro (inline style fixo).

## Detalhe Tecnico

### Arquivo 1: `src/pages/Index.tsx` (KpiCard)

| Linha | Antes | Depois |
|---|---|---|
| 56 | `text-primary-foreground/90` | `text-white/90` |
| 63 | `text-primary-foreground/70` | `text-white/70` |
| 71 | `text-primary-foreground/80` | `text-white/80` |
| 78 | `text-primary-foreground/80` | `text-white/80` |

### Arquivo 2: `src/components/crm/CrmDashboardKpis.tsx` (CRM KPIs)

| Linha | Antes | Depois |
|---|---|---|
| 73 | `text-primary-foreground/90` | `text-white/90` |
| 80 | `text-primary-foreground/70` | `text-white/70` |

Logica: como o fundo dos cards marrons e sempre escuro (inline style fixo, nao muda com tema), o texto deve ser sempre claro. Usar `text-white` com opacidades garante legibilidade em ambos os modos.

2 arquivos, mudanca minima de classes apenas.
