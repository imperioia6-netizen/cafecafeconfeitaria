

# Plano: Implementar debounce atômico + persistência de sessão + fix wasAnswered

## Contexto

O Claude Code descreveu 3 correções que foram **planejadas mas não aplicadas** ao código. Nenhuma das alterações existe no repositório atual. Preciso criar as migrations e atualizar o `evolution-webhook`.

## 1. Migration: Colunas de debounce na tabela `sessions`

Adicionar colunas à tabela `sessions` para suportar o debounce de mensagens rápidas:

```sql
-- Adicionar colunas de debounce
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pending_messages text[] DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS debounce_until timestamptz DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS debounce_leader_id uuid DEFAULT NULL;
```

## 2. Migration: RPCs atômicas de debounce

Criar duas funções SQL com `SELECT ... FOR UPDATE` para garantir que apenas um request processa mensagens acumuladas:

```sql
-- debounce_add_message: adiciona mensagem ao buffer e retorna se este request é o líder
CREATE OR REPLACE FUNCTION debounce_add_message(
  p_remote_jid text,
  p_message text,
  p_delay_ms int DEFAULT 3000
) RETURNS jsonb ...

-- debounce_collect_messages: líder coleta todas as mensagens acumuladas
CREATE OR REPLACE FUNCTION debounce_collect_messages(
  p_remote_jid text,
  p_leader_id uuid
) RETURNS text[] ...
```

A lógica: quando 3 mensagens rápidas chegam ("Oi" / "quero um bolo de 4kg" / "mousse de maracujá"), o primeiro request se torna líder, espera o delay, depois coleta todas as mensagens acumuladas e processa como uma só.

## 3. Atualizar `evolution-webhook/index.ts`

Modificar o fluxo principal (dentro do `serve`) para:

1. Após extrair a mensagem, chamar `debounce_add_message` via RPC
2. Se **não é líder**, retornar `{ ok: true, debounced: true }` imediatamente
3. Se **é líder**, aguardar o delay (3s), chamar `debounce_collect_messages`, concatenar todas as mensagens, e processar normalmente

Fallback: se as RPCs não existem (migration não aplicada), processar sem debounce.

## 4. Persistência de dados na sessão (`memory`)

Atualizar a lógica de salvamento de sessão (linhas 1406-1421) para incluir:
- Peso do pedido (extraído da mensagem)
- Sabor mencionado
- Tipo de pedido (delivery/retirada/encomenda)
- Itens do pedido

Adicionar `buildOrderMemoryHint()` que lê esses dados do `memory` da sessão e injeta como contexto quando o regex do histórico não encontra informação.

## 5. Fix `wasAnswered` (verificação de sabor)

Atualizar a lógica que verifica se uma pergunta sobre sabor foi respondida. Em vez de aceitar qualquer texto com mais de 3 caracteres como "sabor válido", exigir que a resposta contenha padrões reais de sabor (nomes do cardápio, "pode ser de...", "o de...").

## Arquivos alterados

- **Nova migration 1**: `sessions_debounce` — colunas na tabela sessions
- **Nova migration 2**: `debounce_atomic` — RPCs `debounce_add_message` e `debounce_collect_messages`
- **`supabase/functions/evolution-webhook/index.ts`**: lógica de debounce no fluxo principal + persistência melhorada na sessão + fix wasAnswered
- **Deploy**: `evolution-webhook`

## Ordem de execução

1. Aplicar as 2 migrations (via ferramenta de migração)
2. Editar `evolution-webhook/index.ts` com as 3 melhorias
3. Fazer deploy da edge function
4. Testar com mensagens rápidas

