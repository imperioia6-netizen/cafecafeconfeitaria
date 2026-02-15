

# Corrigir Sobreposicao da Faixa "Visao: Cliente" no Carrinho

## Problema

A faixa de simulacao "Visao: Cliente" tem `z-[60]`, enquanto o Sheet do carrinho usa `z-50`. Isso faz a faixa amarela ficar por cima do botao "X" do carrinho, impedindo o fechamento.

## Solucao

### Arquivo: `src/pages/Cardapio.tsx`

Reduzir o z-index da faixa de simulacao de `z-[60]` para `z-40`. Quando o Sheet (carrinho) esta aberto, ele precisa ficar por cima de tudo, incluindo a faixa de simulacao.

- Linha 246: Trocar `z-[60]` por `z-40` na div da faixa "Visao: Cliente"
- Tambem ajustar o header fixo (linha 297) que usa `z-50` — ele continuara acima da faixa, o que e correto
- O Sheet do carrinho com `z-50` ficara naturalmente acima da faixa `z-40`

Hierarquia final de z-index:
- Sheet (carrinho): z-50 — sempre no topo quando aberto
- Header fixo: z-50 — ao nivel do sheet
- Faixa simulacao: z-40 — abaixo do sheet

