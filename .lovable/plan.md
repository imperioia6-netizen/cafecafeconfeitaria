

# Adicionar seletor "Fatia ou Bolo Completo"

## Resumo

Quando a categoria for **Bolo**, aparecera um seletor para o usuario escolher se vende por **fatia** ou por **bolo completo**. Se escolher fatia, o campo "Peso por fatia (g)" aparece. Se escolher bolo completo, esse campo some.

## Alteracoes

### 1. Migracao SQL

Adicionar coluna `sell_mode` na tabela `recipes`:

```sql
ALTER TABLE recipes ADD COLUMN sell_mode text NOT NULL DEFAULT 'fatia';
```

### 2. Formulario (`src/components/recipes/RecipeForm.tsx`)

- Adicionar `sell_mode` ao schema Zod: `z.enum(['fatia', 'inteiro']).default('fatia')`
- Quando categoria = bolo: exibir seletor "Modo de venda" com opcoes **Fatia** e **Bolo Completo**
- Campo "Peso por fatia (g)" aparece somente quando `sell_mode = 'fatia'`
- Validacao `superRefine`: peso obrigatorio apenas se `category === 'bolo' && sell_mode === 'fatia'`
- Labels do calculo em tempo real: "por fatia" vs "por unidade" conforme o modo
- Payload do `onSubmit`: incluir `sell_mode` nos dados salvos

### 3. Layout do formulario (quando categoria = bolo)

```text
[ Categoria      ] [ Modo de venda    ]
[ Peso por fatia (g) ]   <-- so aparece se modo = fatia
```

### 4. Tipos Supabase

Regenerar tipos para incluir `sell_mode` na tabela `recipes`.

