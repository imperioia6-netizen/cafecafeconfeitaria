

# Mover "Relatórios IA" da Produção para Relatórios

## O que muda

1. **`src/pages/Reports.tsx`** — Adicionar aba "Relatórios IA" com o componente `AiReportsPanel`, ao lado das abas de período (7/15/30 dias). A página passa a ter duas seções: relatórios de período e relatórios IA.

2. **`src/pages/Production.tsx`** — Remover a aba "Relatórios IA" e o import do `AiReportsPanel`. Se o owner tiver apenas 2 abas (Produção + Promoções 12h+), manter tabs; se sobrar só Produção, remover tabs para employees.

## Estrutura final da página Relatórios

```text
Relatórios
├── Tab: Desempenho (atual, com sub-tabs 7/15/30 dias)
└── Tab: Relatórios IA (AiReportsPanel movido da Produção)
```

## Arquivos editados
- `src/pages/Reports.tsx` — adicionar tab wrapper + import AiReportsPanel
- `src/pages/Production.tsx` — remover tab "reports"/Brain icon e import AiReportsPanel

