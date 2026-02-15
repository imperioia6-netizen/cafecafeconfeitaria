

# Dialog de Detalhes do Produto no Cardapio Digital

## O que muda

Atualmente, clicar no botao "+" de um produto no cardapio apenas adiciona +1 silenciosamente. A proposta e adicionar um **Dialog de preview** identico ao que ja existe na tela de Pedidos do atendente, permitindo que o cliente:

- Veja a foto ampliada do produto
- Veja nome, categoria e preco
- Ajuste a quantidade com botoes [-] e [+]
- Escreva observacoes (ex: "sem acucar", "metade morango")
- Veja o subtotal dinamico antes de adicionar

## Como funciona

- Clicar no **card do produto** (foto ou nome) abre o Dialog de detalhes
- O botao "+" no canto inferior direito do card continua funcionando como atalho rapido (+1 sem dialog)
- Se o item ja esta no carrinho, o dialog abre pre-preenchido com quantidade e observacao atuais
- O botao principal do dialog mostra "+ Adicionar -- R$ XX,XX" com o subtotal calculado

## Detalhes tecnicos

### Arquivo unico alterado: `src/pages/Cardapio.tsx`

1. **Atualizar tipo `CartItem`**: adicionar campo `notes?: string` para armazenar observacoes por item

2. **Novos estados**:
   - `selectedProduct`: o produto clicado (ou null)
   - `dialogQty`: quantidade no dialog
   - `dialogNotes`: observacao no dialog

3. **Dialog de produto**: componente inline com:
   - Foto do produto ocupando o topo (aspect-ratio 16/9, rounded)
   - Nome do produto em bold + categoria em texto menor
   - Preco unitario em destaque (estilo dourado, consistente com o design)
   - Controles de quantidade: botoes [-] / [+] com campo central
   - Textarea para observacoes com placeholder
   - Botao "Adicionar -- R$ subtotal" com gradiente dourado, full-width

4. **Logica de adicao com notas**: ao confirmar no dialog, o `addToCart` passa a aceitar quantidade e notas, substituindo o item existente no carrinho (merge inteligente)

5. **Evento de clique no card**: separar o clique na area do card (abre dialog) do clique no botao "+" (atalho rapido sem dialog)

6. **Passar `notes` no checkout**: atualizar `handleSubmitOrder` para enviar as observacoes de cada item na chamada da Edge Function `public-order`

7. **Exibir observacoes no Sheet do carrinho**: mostrar a nota de cada item abaixo do nome, em texto pequeno e cinza

### Layout do Dialog

```text
+----------------------------------+
|  [X]                             |
|      [  Foto do produto  ]       |
|                                  |
|  Nome do Produto                 |
|  Categoria                       |
|                                  |
|  R$ 115,00 /unidade              |
|                                  |
|  QUANTIDADE                      |
|  [-]     1     [+]               |
|                                  |
|  OBSERVACOES                     |
|  [Ex: sem acucar, fatia grande ] |
|                                  |
|  [+ Adicionar -- R$ 115,00]     |
+----------------------------------+
```

### Edge Function `public-order`

Verificar se a funcao ja aceita `notes` por item. Se nao, atualizar para receber e salvar no campo `notes` da tabela `order_items` (coluna adicionada na migracao anterior).

