

# Sistema de Pedidos Completo e Intuitivo

## Problemas atuais identificados

1. Clicar no produto apenas adiciona +1 sem feedback claro -- nao da para ajustar quantidade facilmente
2. Nao existe campo de observacao por item (ex: "sem acucar", "metade chocolate metade morango")
3. A barra flutuante do carrinho nao existe -- o atendente nao ve o resumo do pedido
4. Nao ha como editar/remover itens do carrinho antes de criar o pedido
5. A tabela `order_items` no banco nao tem coluna para observacoes

## Solucao proposta

### 1. Nova coluna no banco de dados

Criar migracao SQL para adicionar `notes TEXT` na tabela `order_items`, permitindo observacoes por item.

### 2. Dialog de adicao de produto (o coracao da melhoria)

Quando o atendente clicar em um produto no grid, ao inves de simplesmente adicionar +1, abre um **Dialog** elegante com:

- Foto e nome do produto no topo
- Preco unitario visivel
- **Controle de quantidade** com botoes [-] e [+] e campo numerico central (permite digitar)
- **Campo de observacoes** (textarea) com placeholder "Ex: sem acucar, metade morango..."
- Se o item ja esta no carrinho, o dialog abre pre-preenchido com a quantidade e observacao atuais
- Botoes "Cancelar" e "Adicionar ao pedido" (ou "Atualizar" se ja existe)

### 3. Barra flutuante do carrinho (bottom bar)

Uma barra fixa no rodape com:

- Icone do carrinho + contagem de itens
- Total formatado em R$
- Botao "Ver Pedido" que expande para um painel/sheet lateral
- Botao "Criar Pedido" que envia direto (atalho rapido)

### 4. Painel lateral do carrinho (Sheet)

Ao clicar "Ver Pedido" na barra flutuante, abre um Sheet lateral com:

- Lista de todos os itens com: nome, quantidade, preco, observacao (se houver)
- Botao de editar (reabre o dialog do item) e botao de remover
- Total geral
- Botao "Limpar tudo"
- Botao principal "Criar Pedido"

### 5. Atualizacao do hook useOrders

- Passar `notes` por item no `useCreateOrder`
- Incluir `notes` no insert de `order_items`

### 6. Exibicao de observacoes nos pedidos abertos

Na aba "Pedidos Abertos", cada item mostra sua observacao (se existir) em texto menor abaixo do nome.

## Layout do Dialog de Produto

```text
+----------------------------------+
|  [X]                             |
|         [Foto do produto]        |
|                                  |
|    Abacaxi com Creme             |
|    R$ 115,00                     |
|                                  |
|    Quantidade                    |
|    [-]    3    [+]               |
|                                  |
|    Observacoes                   |
|    [sem acucar, fatia grande   ] |
|    [                           ] |
|                                  |
|    [Adicionar - R$ 345,00]       |
+----------------------------------+
```

## Layout da barra flutuante

```text
+--------------------------------------------------+
| [carrinho] 4 itens    R$ 478,00   [Criar Pedido] |
+--------------------------------------------------+
```

## Arquivos alterados

1. **Nova migracao SQL**: adicionar coluna `notes` em `order_items`
2. **`src/integrations/supabase/types.ts`**: adicionar `notes` ao tipo `order_items`
3. **`src/hooks/useOrders.ts`**: incluir `notes` no insert de items
4. **`src/pages/Orders.tsx`**: refatoracao principal com:
   - Novo estado para o dialog de produto (`selectedProduct`, `editQuantity`, `editNotes`)
   - Tipo `NewOrderItem` atualizado com campo `notes`
   - Componente do dialog de adicao
   - Barra flutuante do carrinho
   - Sheet lateral para revisao do pedido
   - Exibicao de observacoes nos pedidos abertos

