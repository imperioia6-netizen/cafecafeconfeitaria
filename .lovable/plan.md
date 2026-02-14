

# Reformular formulario de cadastro de produtos

## Resumo

O formulario atual pede "peso por fatia" para todas as categorias, mas isso so faz sentido para **Bolo**. Alem disso, o campo "Estoque minimo" de produtos prontos nao e util — o que importa e o estoque de ingredientes. Vamos simplificar o formulario.

---

## Alteracoes

### 1. Campo "Peso por fatia" condicional (somente Bolo)

- O campo "Peso por fatia (g)" so aparece quando a categoria selecionada for **bolo**
- Para outras categorias, o valor sera salvo como `null` ou um valor padrao (250) no banco
- O schema Zod sera ajustado para tornar `slice_weight_g` opcional (obrigatorio apenas quando categoria = bolo)

### 2. Remover campo "Estoque minimo"

- O campo "Estoque minimo" sera removido do formulario, pois controlar estoque de produtos prontos nao faz sentido — o controle deve ser feito nos ingredientes
- O valor sera salvo como 0 por padrao

### 3. Layout ajustado

- Quando categoria nao for bolo: Categoria ocupa a linha inteira (ou fica ao lado do preco)
- Quando categoria for bolo: Categoria + Peso por fatia lado a lado (como esta hoje)
- Preco de venda e Custo direto ficam lado a lado
- Formulario fica mais limpo e direto

---

## Detalhes tecnicos

### Arquivo: `src/components/recipes/RecipeForm.tsx`

1. **Schema Zod**: Mudar `slice_weight_g` de obrigatorio para opcional com `z.coerce.number().optional()`, e usar `superRefine` ou condicional para exigir apenas quando `category === 'bolo'`
2. **Watch category**: Usar `watch('category')` para mostrar/esconder o campo de peso condicionalmente
3. **Remover campo `min_stock`**: Remover do formulario, manter valor padrao 0 no submit
4. **Reorganizar grid**: Categoria em linha propria quando nao for bolo; Preco + Custo direto lado a lado
5. **Labels de calculo**: Ajustar o bloco de "Calculo em tempo real" para nao mencionar "fatia" quando nao for bolo

