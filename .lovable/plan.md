

# Corrigir erros de build nas Edge Functions

## Problema
Todos os erros de `'never'` acontecem porque `createClient()` sem tipo genérico faz o TypeScript inferir tipos vazios para as tabelas. O erro em `agentLogic.ts` é um null check simples.

## Correções

### 1. `supabase/functions/evolution-webhook/index.ts`
- Linha 140: Alterar tipo do parâmetro `supabase` de `ReturnType<typeof createClient>` para `any`
- Todas as outras funções que recebem `supabase` como parâmetro: mesmo tratamento
- Isso elimina todos os ~20 erros de `'never'` neste arquivo de uma só vez

### 2. `supabase/functions/_shared/agentLogic.ts` (linha 268)
- Alterar `${cardapioProdutos.replace(...)}` para `${(cardapioProdutos ?? "").replace(...)}`

### 3. `supabase/functions/agent-chat/index.ts` (linha 23)
- Alterar `createClient(supabaseUrl, serviceKey)` para `createClient<any>(supabaseUrl, serviceKey)` para consistência

## Impacto
- Zero mudança de comportamento em runtime
- Elimina todos os erros de build listados
- Arquivos editados: 3

