

# Botoes de Editar e Excluir nas Vendas de Hoje (Owner Only)

## Resumo

Adicionar botoes de editar e excluir em cada linha da lista "Vendas de Hoje", visiveis apenas para usuarios com perfil Owner (isOwner). Editar permitira alterar canal, forma de pagamento e total. Excluir removera a venda e seus itens, devolvendo o estoque.

## Alteracoes

### 1. Hooks (`src/hooks/useSales.ts`)

Adicionar dois hooks:

- **`useDeleteSale`**: Remove os `sale_items` da venda, devolve as quantidades ao inventario (`slices_available`), e entao deleta a venda. Invalida queries de sales e inventory.
- **`useUpdateSale`**: Atualiza campos editaveis da venda (channel, payment_method, total). Invalida query de sales.

### 2. Pagina de Vendas (`src/pages/Sales.tsx`)

- Importar `isOwner` do `useAuth()`
- Importar icones `Pencil`, `Trash2` do lucide-react
- Importar `AlertDialog` para confirmacao de exclusao
- Adicionar estado para controle de edicao inline e dialogo de exclusao

Na lista de "Vendas de Hoje", cada linha ganha (quando `isOwner`):
- Botao de editar (icone lapis) -- abre edicao inline com selects de canal/pagamento e input de total
- Botao de excluir (icone lixeira) -- abre AlertDialog de confirmacao antes de deletar

```text
19:38  [Balcao]  Pix                    R$ 15.00  [Editar] [Excluir]
```

A exclusao devolvera automaticamente as fatias ao estoque. A edicao permitira salvar ou cancelar inline.

### 3. Detalhes tecnicos

- `useDeleteSale`: busca `sale_items` da venda, para cada item devolve `quantity` ao `slices_available` do inventory correspondente, deleta `sale_items`, deleta `sales`
- `useUpdateSale`: `supabase.from('sales').update({...}).eq('id', saleId)`
- AlertDialog para confirmacao de exclusao (mesmo padrao usado no CashRegister)
- Botoes aparecem apenas quando `isOwner === true`
- Estado `editingSaleId` para controlar qual venda esta em modo edicao

