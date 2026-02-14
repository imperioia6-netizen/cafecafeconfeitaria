

# Ficha de Producao Detalhada

## Resumo

Expandir a secao "Producao de Hoje" para funcionar como uma ficha de producao completa, mostrando para cada item os detalhes financeiros (custo, preco de venda, receita potencial) e um resumo totalizador no topo para o administrador analisar o panorama geral.

## Alteracoes

### 1. Query de producoes (`src/hooks/useProductions.ts`)

Incluir `sale_price` e `direct_cost` no select da query para ter os dados financeiros disponiveis:

```
.select('*, recipes(name, category, sale_price, direct_cost)')
```

### 2. Cada item da timeline (`src/pages/Production.tsx`)

Adicionar uma linha extra em cada producao mostrando:

- **Receita potencial**: `fatias x preco de venda` (em verde)
- **Custo total**: valor ja existente
- **Margem**: receita - custo

Layout por item:

```text
● bolo de murangu   [17 fatias]
  18:53  1.700g  Custo: R$ 102.00
  Receita potencial: R$ 170.00  |  Margem: R$ 68.00
```

### 3. Resumo totalizador no topo da secao

Antes da lista, exibir cards com totais do dia:

- **Total de producoes** (quantidade de registros)
- **Total de fatias** (soma de todas as fatias)
- **Custo total do dia** (soma dos custos)
- **Receita potencial do dia** (soma de fatias x preco de venda de cada producao)
- **Margem total** (receita - custo)

Layout:

```text
+-------------+-------------+--------------+------------------+--------------+
| Producoes   | Fatias      | Custo total  | Receita potencial| Margem total |
|     3       |    52       | R$ 312.00    | R$ 520.00        | R$ 208.00    |
+-------------+-------------+--------------+------------------+--------------+
```

### 4. Detalhes tecnicos

- Os totais serao calculados com `reduce` sobre o array `productions`
- A receita potencial de cada item: `p.slices_generated * p.recipes.sale_price`
- A margem de cada item: `receita potencial - p.total_cost`
- Cores: receita potencial em verde (`text-success`), margem em verde se positiva / vermelho se negativa
- Grid dos totalizadores: `grid-cols-2 md:grid-cols-5` com o mesmo estilo `glass rounded-lg` usado na previa

