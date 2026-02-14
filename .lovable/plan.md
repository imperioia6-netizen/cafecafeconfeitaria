

# Adicionar "Receita Total" na previa da producao

## Resumo

Adicionar um quinto card na previa da producao mostrando o valor total que as fatias irao gerar em vendas (fatias x preco de venda).

## Alteracao

### `src/pages/Production.tsx`

Na secao de stats da previa, adicionar um novo item ao array:

- **Label**: "Receita total" (ou "Faturamento")
- **Valor**: `slices * salePrice`, formatado como `R$ X.XX`
- **Icone**: `DollarSign`
- **Cor**: verde (sempre positivo)

O grid passa de `grid-cols-2 md:grid-cols-4` para `grid-cols-2 md:grid-cols-5` para acomodar o quinto card.

### Calculo

```text
Receita total = slices x salePrice
```

As variaveis `slices` e `salePrice` ja existem no componente, nao e necessario nenhum dado adicional.

