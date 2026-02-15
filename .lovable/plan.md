

# Correcao do calculo de margem no RecipeForm

## Problema

O calculo atual de `costPerGram` esta errado. O `direct_cost` representa o custo **total da receita** (ex: um bolo inteiro de 3kg custa R$90). Mas quando o usuario so vende fatia (sem "Vende Inteiro" ativo), o codigo divide `direct_cost / slice_weight_grams`, o que e incorreto -- divide o custo do bolo inteiro pelo peso de uma unica fatia.

Exemplo do bug (visivel na screenshot):
- Custo total: R$30 (custo da receita inteira, digamos 100g de fatia)
- `costPerGram = 30 / 100 = 0.30` -- mas 30 e o custo do bolo inteiro, nao da fatia
- Resultado: fatia custa R$30, margem -100%

## Solucao

O `direct_cost` e **sempre o custo total da receita**. O denominador para calcular custo/grama deve ser **o peso total da receita** (que e `whole_weight_grams` quando disponivel). Quando so vende fatia, o usuario precisa informar o peso total da receita para que o calculo funcione, OU o `direct_cost` deve ser interpretado como custo por unidade/fatia.

A abordagem mais clara: adicionar um campo explicito "Peso total da receita (g)" que sempre aparece quando `direct_cost` e preenchido, independente do modo de venda. Esse peso e usado exclusivamente para calcular custo/grama.

Porem, olhando a modelagem atual, `whole_weight_grams` ja serve como "peso total da receita". O problema e que quando o usuario nao ativa "Vende Inteiro", esse campo fica oculto e nulo.

### Mudanca proposta

**Arquivo: `src/components/recipes/RecipeForm.tsx`**

1. Adicionar um campo "Peso total da receita (g)" que aparece sempre que `direct_cost` for preenchido, separado dos campos de venda. Este campo sera mapeado para `whole_weight_grams` internamente (ou um campo auxiliar no form).

2. Corrigir a logica de `costPerGram`:

```
// ANTES (errado):
costPerGram = wholeWeightNum > 0 
  ? costNum / wholeWeightNum 
  : (sliceWeightNum > 0 ? costNum / sliceWeightNum : 0);

// DEPOIS (correto):
// Usar peso total da receita como denominador
// whole_weight_grams = peso total da receita (sempre preenchido quando tem custo)
costPerGram = recipeWeightNum > 0 ? costNum / recipeWeightNum : 0;
```

3. Calculos derivados:
   - `wholeCost = costPerGram * wholeWeightNum` (custo de vender 1 inteiro)
   - `sliceCost = costPerGram * sliceWeightNum` (custo de vender 1 fatia)
   - `wholeMargin = (wholePrice - wholeCost) / wholePrice * 100`
   - `sliceMargin = (slicePrice - sliceCost) / slicePrice * 100`

### Detalhes da implementacao

No form, adicionar um campo "Peso total da receita (g)" no bloco de custo (perto de `direct_cost`), com placeholder "Ex: 3000". Esse campo alimenta o calculo de custo/grama. Quando "Vende Inteiro" esta ativo, o `whole_weight_grams` ja e esse valor. Quando nao esta, o campo ainda aparece para permitir o calculo.

No schema Zod, adicionar validacao: se `direct_cost` for preenchido, `recipe_total_weight_grams` tambem deve ser preenchido.

No payload de submit, salvar esse valor em `whole_weight_grams` (mesmo que nao venda inteiro) para manter o custo/grama correto no banco.

