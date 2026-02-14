

# Botoes de Editar e Excluir na Ficha de Producao

## Resumo

Adicionar botoes de editar e excluir em cada item da timeline de producao, com dialogo de confirmacao para exclusao e modal de edicao para alterar peso/fatias.

## Alteracoes

### 1. Hook de exclusao e edicao (`src/hooks/useProductions.ts`)

Criar dois novos hooks:

- **`useDeleteProduction`**: Deleta a producao e o registro de inventario associado (`production_id`), invalida queries de `productions` e `inventory`
- **`useUpdateProduction`**: Atualiza `weight_produced_g`, `slices_generated` e `total_cost` de uma producao existente, e atualiza o `slices_available` no inventario correspondente

### 2. Botoes na timeline (`src/pages/Production.tsx`)

Adicionar no canto direito de cada item da timeline:

- **Icone de lapis** (Pencil) para editar
- **Icone de lixeira** (Trash2) para excluir

Layout atualizado por item:

```text
● bolo de murangu  [17 fatias]              [editar] [excluir]
  18:53  1.700g  Custo: R$ 102.00
  Receita: R$ 255.00  Margem: R$ 153.00
```

### 3. Confirmacao de exclusao

Usar `AlertDialog` (mesmo padrao do RecipeCard) para confirmar antes de excluir. Ao confirmar, deleta producao e inventario associado.

### 4. Modal de edicao

Usar `Dialog` com campos:

- **Peso produzido (kg)**: input numerico pre-preenchido
- **Preview automatico**: recalcula fatias, custo e receita em tempo real (mesma logica do formulario de nova producao)
- Botao "Salvar" atualiza producao e inventario

### 5. Detalhes tecnicos

- Exclusao: primeiro deletar inventario com `production_id`, depois deletar producao
- Edicao: recalcular `slices_generated` e `total_cost` com base no novo peso e dados da receita (`slice_weight_g`, `direct_cost`)
- Toast de sucesso/erro em ambas as acoes
- Invalidar queries `productions` e `inventory` apos cada operacao

