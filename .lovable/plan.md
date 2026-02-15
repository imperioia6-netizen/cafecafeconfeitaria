

# Fixar Barra "Fazer Pedido" Mais Abaixo na Tela

## Problema

A barra flutuante com o carrinho e o botao "Fazer Pedido" no cardapio do cliente esta posicionada muito alta na tela (bottom-16), sobrepondo os cards de produtos.

## Solucao

Ajustar o posicionamento da barra flutuante para ficar colada na parte inferior da tela. Como o cardapio publico do cliente nao tem a barra de navegacao inferior (MobileBottomNav), nao ha necessidade do offset `bottom-16`.

## Detalhe Tecnico

### Arquivo: `src/pages/Cardapio.tsx`

Na linha 526, alterar a classe da barra flutuante:

- **De:** `fixed bottom-16 md:bottom-0`
- **Para:** `fixed bottom-0`

Tambem ajustar o `pb-24` do container principal para `pb-20`, garantindo que o ultimo card nao fique escondido atras da barra.

| Arquivo | Mudanca |
|---|---|
| `src/pages/Cardapio.tsx` | Mover barra flutuante para bottom-0 e ajustar padding inferior |

1 arquivo, mudanca minima.
