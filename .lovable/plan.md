

# Reestruturar Pagina de Estoque: Estoque, Vitrine e Alertas

## Resumo

Reorganizar a pagina de Estoque em 3 abas com funcoes distintas:

- **Estoque**: Gerenciamento de ingredientes (materias-primas) com quantidades, unidades e controle de nivel
- **Vitrine**: Produtos prontos em exposicao (atual aba de "Estoque" -- bolos/fatias produzidos)
- **Alertas**: Notificacoes de ingredientes acabando, produtos na vitrine perto da validade, e estoque baixo

## Alteracoes no Banco de Dados

Adicionar campos de controle de estoque na tabela `ingredients`:

```sql
ALTER TABLE public.ingredients
  ADD COLUMN stock_quantity numeric DEFAULT 0,
  ADD COLUMN min_stock numeric DEFAULT 0,
  ADD COLUMN expiry_date date DEFAULT NULL;
```

- `stock_quantity`: quantidade atual em estoque
- `min_stock`: nivel minimo para gerar alerta
- `expiry_date`: data de validade do lote atual

## Alteracoes nos Hooks

### `src/hooks/useIngredientStock.ts` (novo)

- `useIngredientStock()`: lista todos os ingredientes com campos de estoque
- `useAddIngredientStock()`: mutation para adicionar/atualizar quantidade de um ingrediente
- `useUpdateIngredientStock()`: mutation para editar stock_quantity, min_stock e expiry_date
- `useLowStockIngredients()`: query filtrando ingredientes onde `stock_quantity <= min_stock`

### `src/hooks/useAlerts.ts` (atualizado)

- Manter hooks existentes
- Os alertas continuam vindo da tabela `alerts`, que ja suporta tipos `estoque_baixo` e `validade_12h`

## Componentes Novos

### `src/components/inventory/EstoqueTab.tsx`

- Lista de ingredientes em cards com: nome, quantidade atual, unidade, nivel minimo, validade
- Barra de progresso visual (quantidade atual vs minimo)
- Botao para adicionar novo ingrediente (dialog com formulario: nome, quantidade, unidade, preco, estoque minimo, validade)
- Botao de edicao rapida de quantidade (incrementar/decrementar)
- Filtros: Todos, Baixo Estoque, Vencendo

### `src/components/inventory/VitrineTab.tsx`

- Extrair o conteudo atual de `InventoryContent` para este componente
- Mesma logica de cards de produtos produzidos com fatias, tempo de vida, barra de vida
- Filtros: Todos, Normal, Atencao, Critico

### `src/components/inventory/AlertasTab.tsx`

- Extrair o conteudo atual de `AlertsContent` para este componente
- Mesma timeline de alertas com resolucao

## Alteracoes na Pagina

### `src/pages/Inventory.tsx`

- Substituir as 2 abas (Estoque + Alertas) por 3 abas: **Estoque**, **Vitrine**, **Alertas**
- Icones: `ShoppingBasket` para Estoque, `Store` para Vitrine, `AlertTriangle` para Alertas
- Importar os 3 novos componentes de aba
- Contador de alertas na aba de Alertas (ja existente)
- Contador de itens na Vitrine (ja existente)
- Contador de ingredientes no Estoque (novo)

## Detalhes Tecnicos

- O formulario de adicionar ingrediente reutiliza a tabela `ingredients` existente, apenas populando os novos campos
- A logica de alertas automaticos (ingrediente acabando, validade proxima) pode ser adicionada futuramente via edge function ou trigger SQL
- Os alertas manuais continuam funcionando pela tabela `alerts` existente

