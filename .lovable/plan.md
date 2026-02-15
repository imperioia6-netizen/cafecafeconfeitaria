

# Corrigir Legibilidade dos Cards Marrons

## Problema

Os cards com fundo marrom escuro (gradiente `hsl(24 60% 20%)` a `hsl(24 50% 14%)`) usam cores de texto com opacidade muito baixa:
- Titulo: `text-primary-foreground/70` (30% invisivel)
- Subtexto: `text-primary-foreground/50` (metade invisivel)  
- Linhas 7d/30d: `text-primary-foreground/60` (40% invisivel)

Resultado: texto praticamente ilegivel contra o fundo escuro.

## Solucao

Aumentar a opacidade e luminosidade do texto nos cards marrons para garantir contraste WCAG AA:

| Elemento | Antes | Depois |
|---|---|---|
| Label (titulo) | `text-primary-foreground/70` | `text-primary-foreground/90` |
| Subtexto | `text-primary-foreground/50` | `text-primary-foreground/70` |
| Linhas periodo | `text-primary-foreground/60` | `text-primary-foreground/80` |
| Divider | `border-white/10` | `border-white/20` |

## Arquivos Afetados

### 1. `src/pages/Index.tsx` -- KpiCard do Dashboard
- Linha 56: label do titulo `/70` para `/90`
- Linha 63: "Hoje:" `/50` para `/70`
- Linhas 71, 78: linhas 7d/30d `/60` para `/80`
- Linha 70: border divider `white/10` para `white/20`

### 2. `src/components/crm/CrmDashboardKpis.tsx` -- KPIs do CRM
- Linha 73: label do titulo `/70` para `/90`
- Linha 80: subtexto `/50` para `/70`

Nenhuma mudanca estrutural, apenas ajuste de opacidades para legibilidade.

