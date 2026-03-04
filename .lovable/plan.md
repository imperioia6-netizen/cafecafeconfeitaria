
# Adicionar Botoes de Editar e Excluir nos Cards de Ingredientes

## O que muda

Cada card de ingrediente no painel de Estoque ganha dois botoes no canto superior direito: **Editar** (icone de lapis) e **Excluir** (icone de lixeira). O botao de editar abre um dialog pre-preenchido com os dados do ingrediente para alteracao. O botao de excluir pede confirmacao antes de remover.

## Detalhes Tecnicos

### Arquivo: `src/hooks/useIngredientStock.ts`
- Adicionar hook `useUpdateIngredient` que permite atualizar todos os campos do ingrediente (name, unit, price_per_unit, stock_quantity, min_stock, expiry_date)
- Adicionar hook `useDeleteIngredient` que deleta o ingrediente pelo id

### Arquivo: `src/components/inventory/EstoqueTab.tsx`
- Importar icones `Pencil`, `Trash2` do lucide-react
- Importar `AlertDialog` components para confirmacao de exclusao
- Adicionar estado `editingItem` (IngredientStock | null) para controlar o dialog de edicao
- Adicionar estado `deletingId` (string | null) para controlar o alert de exclusao
- No header de cada card (ao lado dos badges), adicionar dois botoes pequenos com icones:
  - Lapis (Editar): abre o dialog de edicao com os dados pre-preenchidos
  - Lixeira (Excluir): abre AlertDialog de confirmacao
- Reutilizar o mesmo layout do dialog de criacao para o dialog de edicao, com titulo "Editar Ingrediente" e botao "Salvar Alteracoes"
- O AlertDialog de exclusao mostra mensagem "Tem certeza que deseja excluir {nome}?" com botoes "Cancelar" e "Excluir"
- Ambas acoes com try/catch e toast de feedback

### Layout dos botoes no card

Os botoes de editar e excluir ficam discretos no canto superior direito do card, entre o nome e os badges de status. Sao botoes ghost/outline pequenos (size="icon", variante "ghost") para nao poluir visualmente, mas ficam acessiveis.

```text
+----------------------------------+
| Nome do Ingrediente  [E][X] Baixo|
| kg                               |
| ...                              |
+----------------------------------+
```

Onde [E] = icone lapis, [X] = icone lixeira, ambos com hover sutil.
