

# Plano: Consultas da IA para a Equipe

## O que sera construido

Uma nova aba "Consultas" na pagina "Comprovar Pagamentos" (que vira uma pagina com tabs: "Comprovantes" e "Consultas"). Quando a IA nao sabe responder algo e gera `[ALERTA_EQUIPE]`, em vez de apenas enviar WhatsApp ao dono, tambem cria um registro no banco. O dono ve a consulta na plataforma com nome/telefone do cliente e a duvida, escreve a instrucao de resposta, e o sistema envia essa resposta ao cliente via WhatsApp.

## Arquivos e mudancas

### 1. Migration: criar tabela `agent_queries`

```sql
create table public.agent_queries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  remote_jid text not null,
  query_text text not null,        -- duvida extraida do [ALERTA_EQUIPE]
  response_text text,              -- instrucao do dono
  status text not null default 'pending',  -- pending | answered
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
alter table public.agent_queries enable row level security;
-- RLS: owner can manage, employee can read
```

### 2. `supabase/functions/evolution-webhook/index.ts`

No bloco que processa `ALERTA_EQUIPE` (linha ~1370), alem de enviar WhatsApp ao dono, inserir registro em `agent_queries` com os dados do cliente e a duvida.

### 3. `src/pages/ConfirmPayments.tsx`

Transformar em pagina com 2 tabs:
- **Comprovantes** — conteudo atual
- **Consultas** — nova aba com lista de consultas pendentes

### 4. `src/components/confirm/AgentQueriesTab.tsx` (novo)

Componente da aba Consultas:
- Lista consultas `status = 'pending'` com Realtime
- Cada item mostra: nome do cliente, telefone (clicavel), a duvida da IA, e horario
- Campo de texto para o dono escrever a instrucao de resposta
- Botao "Responder" que:
  1. Chama `send-whatsapp` para enviar a resposta ao cliente
  2. Atualiza `agent_queries` com `status = 'answered'` e `response_text`

### 5. `supabase/functions/send-whatsapp/index.ts`

Sem alteracao — ja suporta enviar mensagem para qualquer `remote_jid`.

## Fluxo

1. Cliente pergunta algo que a IA nao sabe → IA responde "vou consultar a equipe" + gera `[ALERTA_EQUIPE]`
2. Webhook salva em `agent_queries` + envia WhatsApp ao dono
3. Dono abre Comprovar > aba Consultas, ve a duvida com nome/telefone
4. Dono escreve a instrucao e clica "Responder"
5. Sistema envia via WhatsApp ao cliente e marca como respondida

