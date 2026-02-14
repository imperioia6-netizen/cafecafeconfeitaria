

# Gerenciamento de Producao Automatico por Funcionario

## Resumo

Vincular automaticamente cada producao ao funcionario logado, exibindo o nome do operador na ficha de producao para que o administrador saiba exatamente quem fez cada registro -- sem nenhuma acao manual extra.

## Alteracoes

### 1. Query de producoes com dados do operador (`src/hooks/useProductions.ts`)

Expandir o select para incluir o perfil do operador via `operator_id`:

```
.select('*, recipes(name, category, sale_price, direct_cost), profiles!productions_operator_id_fkey(name)')
```

Nota: Como nao existe FK direta entre `productions.operator_id` e `profiles.user_id`, sera necessario buscar o nome do operador de outra forma. Duas opcoes:

- **Opcao A**: Criar uma view ou funcao SQL que faz o join
- **Opcao B** (mais simples): Fazer uma query separada para buscar os nomes dos perfis dos operadores presentes nas producoes do dia

Vamos usar a **Opcao B** -- apos carregar as producoes, extrair os `operator_id` unicos e buscar os nomes correspondentes na tabela `profiles`.

### 2. Exibir nome do operador na timeline (`src/pages/Production.tsx`)

Cada item da timeline passara a mostrar o nome do funcionario:

```text
 bolo de murangu  [17 fatias]              [editar] [excluir]
  18:53  1.700g  Custo: R$ 102.00
  Receita: R$ 255.00  Margem: R$ 153.00
  Operador: Maria Silva
```

- Adicionar icone de usuario (User) e nome do operador em cada entrada
- Para o admin (owner), esta informacao e visivel; para o funcionario, ve apenas suas proprias producoes

### 3. Filtro por operador para administradores

Na secao "Ficha de Producao -- Hoje", adicionar um seletor de filtro (visivel apenas para owners):

- "Todos os funcionarios" (padrao)
- Lista dos funcionarios que produziram no dia

Isso permite ao admin analisar a producao individual de cada funcionario.

### 4. Registro automatico do operador

O `operator_id` ja e preenchido automaticamente com `user.id` ao criar uma producao. Nao requer mudanca -- ja e automatico.

### 5. Detalhes tecnicos

- Criar um hook auxiliar ou expandir `useTodayProductions` para retornar um mapa `operatorId -> nome`
- Buscar perfis com: `supabase.from('profiles').select('user_id, name').in('user_id', operatorIds)`
- Filtro de operador: estado local `filterOperator` com `Select` no topo da ficha
- Condicional de visibilidade: usar `isOwner` do `useAuth()` para mostrar/esconder o filtro
- Nenhuma migracao de banco necessaria -- os dados ja existem

