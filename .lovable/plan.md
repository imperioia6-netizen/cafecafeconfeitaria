

# Adicionar campo "Peso (Kg)" para bolos vendidos como "Bolo Completo"

## O que muda

Quando um bolo e cadastrado no modo "Bolo Completo", o formulario passa a exibir um campo para informar o peso total do bolo em quilogramas (ex: 1.5 Kg, 2 Kg). Esse campo nao aparece para bolos vendidos por fatia (que ja tem o campo "Peso por fatia em gramas") nem para outras categorias.

## Detalhes tecnicos

### 1. Nova coluna no banco de dados

Criar uma migration adicionando a coluna `weight_kg` (numeric, nullable) na tabela `recipes`:

```sql
ALTER TABLE recipes ADD COLUMN weight_kg numeric;
```

### 2. Atualizar tipos TypeScript

O arquivo `src/integrations/supabase/types.ts` sera regenerado automaticamente com o novo campo.

### 3. Atualizar formulario (`src/components/recipes/RecipeForm.tsx`)

- Adicionar `weight_kg` ao schema Zod como `z.coerce.number().optional()`
- Adicionar validacao: quando categoria = `bolo` e sell_mode = `inteiro`, exigir `weight_kg >= 0.1`
- Mostrar campo "Peso do bolo (Kg)" quando `isBolo && !isFatia` (modo "Bolo Completo")
- Input com `step="0.1"` e placeholder "Ex: 1.5"
- Incluir `weight_kg` no payload de criacao/atualizacao
- Carregar valor existente no `defaultValues` ao editar

### 4. Exibir peso no card do produto (`src/components/recipes/RecipeCard.tsx`)

- Quando o produto for bolo com sell_mode = `inteiro` e tiver `weight_kg`, mostrar "1.5 Kg" em vez de "Fatia: 250g"
- Logica condicional: se `sell_mode === 'inteiro'` mostrar peso total, senao mostrar peso da fatia

### 5. Exibir peso no Cardapio Digital (`src/pages/Cardapio.tsx`)

- Se o produto for bolo completo com `weight_kg`, exibir a informacao de peso (ex: "1.5 Kg") no card do cardapio publico para o cliente saber o tamanho

