

# Produtos com Foto/Preco e Anotacoes de Pedido na Venda

## Resumo

Duas melhorias na pagina de Vendas:

1. **Produtos com mais informacoes**: exibir foto do produto (da receita) e preco sugerido (sale_price) nos cards de produtos disponiveis, preenchendo automaticamente o preco no carrinho
2. **Anotacoes de pedido**: adicionar campos opcionais de comanda, mesa e nome do cliente diretamente na venda

## Alteracoes no Banco de Dados

Adicionar 3 colunas na tabela `sales`:

```sql
ALTER TABLE public.sales
  ADD COLUMN order_number text DEFAULT NULL,
  ADD COLUMN table_number text DEFAULT NULL,
  ADD COLUMN customer_name text DEFAULT NULL;
```

- `order_number`: numero da comanda (texto livre, ex: "042")
- `table_number`: numero da mesa (texto livre, ex: "5")
- `customer_name`: nome do cliente (texto livre, ex: "Maria")

Esses campos sao opcionais e complementam o `customer_id` ja existente.

## Alteracoes no Hook `useSales.ts`

- Adicionar `order_number`, `table_number` e `customer_name` ao input de `useCreateSale`
- Passar esses campos no insert da tabela `sales`
- Incluir esses campos na query de `useTodaySales`

## Alteracoes na Pagina `Sales.tsx`

### Cards de Produtos

- Buscar dados da receita via relacao `inventory -> recipes` (ja existente: `item.recipes`)
- Exibir `photo_url` da receita como miniatura no card do produto
- Exibir `sale_price` como preco de referencia no card
- Ao adicionar ao carrinho, preencher `unit_price` automaticamente com o `sale_price` da receita

### Anotacoes de Pedido (no carrinho)

Adicionar secao "Anotacoes" no carrinho com 3 campos opcionais:

- **Comanda**: input de texto curto para numero da comanda
- **Mesa**: input de texto curto para numero da mesa
- **Nome do cliente**: input de texto para nome (substitui ou complementa o seletor de cliente existente)

Esses campos aparecem acima dos seletores de Canal e Pagamento.

### Vendas de Hoje

- Exibir comanda, mesa e nome do cliente quando preenchidos, usando badges ou texto secundario na linha da venda

## Detalhes Tecnicos

- O `useInventory` ja faz join com `recipes`, entao `item.recipes?.photo_url` e `item.recipes?.sale_price` ja estao disponiveis
- Os campos de anotacao sao states locais (`orderNumber`, `tableNumber`, `customerName`) resetados apos cada venda
- O campo `customer_name` e texto livre e independente do `customer_id` (CRM) -- permite anotar nomes rapidos sem cadastrar cliente
- Validacao: campos de texto com `maxLength` para seguranca (comanda: 20, mesa: 10, nome: 100)

