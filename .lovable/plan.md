

# Fix: Tela Branca — Arquivo `.env` Ausente

## Diagnóstico

O arquivo `.env` foi deletado ou perdido. Sem ele, as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` são `undefined`, causando o erro `supabaseUrl is required` na inicialização do cliente Supabase — crash imediato, tela branca.

## Solução

1. **Recriar o arquivo `.env`** com as credenciais do projeto Supabase já conhecidas:
   - `VITE_SUPABASE_PROJECT_ID=osewboiklhfiunetoxzo`
   - `VITE_SUPABASE_URL=https://osewboiklhfiunetoxzo.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon key completa)

2. **Adicionar validação defensiva** no `client.ts` para evitar crash silencioso caso as env vars sumam novamente — logar erro legível no console em vez de tela branca.

## Escopo
- Criar `.env`
- Editar `src/integrations/supabase/client.ts` com fallback defensivo

