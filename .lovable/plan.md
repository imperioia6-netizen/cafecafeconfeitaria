

# Remover Botoes de Editar e Excluir nas Vendas de Hoje

## Resumo

Remover os botoes de editar e excluir da lista "Vendas de Hoje" na pagina de Vendas, incluindo toda a logica de edicao inline e dialogo de exclusao.

## Alteracoes

### `src/pages/Sales.tsx`

- Remover imports nao mais necessarios: `Pencil`, `Trash2`, `Save`, `AlertDialog` e seus sub-componentes
- Remover os hooks `useUpdateSale` e `useDeleteSale`
- Remover todos os estados de edicao e exclusao: `editingSaleId`, `editChannel`, `editPayment`, `editTotal`, `deletingSaleId`
- Remover as funcoes `startEdit`, `handleUpdate`, `handleDelete`
- Simplificar a renderizacao de cada venda na lista, removendo o bloco condicional de edicao inline e os botoes de acao (lapis e lixeira)
- Remover o componente `AlertDialog` de confirmacao de exclusao no final da pagina
- Cada linha passara a exibir apenas: horario, badge do canal, metodo de pagamento, e valor total

### `src/hooks/useSales.ts`

- Remover os hooks `useUpdateSale` e `useDeleteSale` e o type `CartItem` exportado por eles (se nao for usado em outro lugar)
- Manter apenas `useCreateSale` e `useTodaySales`

