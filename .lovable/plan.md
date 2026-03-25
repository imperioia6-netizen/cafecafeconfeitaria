

# Plano: Chat ao vivo + Retomada manual de conversas da IA

## O que sera construido

Uma nova aba "Conversas" no CRM (entre "Reativacao" e "Config") com interface estilo WhatsApp Web: lista de conversas a esquerda, chat a direita, botoes "Retomar" e "Voltar para IA".

## Arquivos a criar/editar

### 1. `src/hooks/useLiveChats.ts` (novo)
- Query `crm_messages` agrupando por `customer_id` com join em `customers` (nome, phone, `ia_lock_at`)
- Ordenar por ultima mensagem
- Supabase Realtime subscription no canal `crm_messages` para updates em tempo real
- Mutation para toggle `ia_lock_at`/`ia_lock_reason` no customer
- Mutation para enviar mensagem via edge function `send-whatsapp`

### 2. `src/components/crm/LiveChatsPanel.tsx` (novo)
- Layout split: lista de conversas (esquerda) + chat (direita)
- Lista mostra: nome do cliente, preview da ultima mensagem, horario, badge "Manual" se `ia_lock_at` ativo
- Chat mostra bolhas (entrada = esquerda, saida = direita) com scroll automatico
- Botao "Retomar" (seta `ia_lock_at = now()`) e "Voltar para IA" (limpa `ia_lock_at`)
- Input de mensagem + botao enviar (só habilitado quando em modo manual)
- Mobile: lista ocupa tela cheia, ao clicar abre o chat

### 3. `src/pages/Crm.tsx` (editar)
- Adicionar tab `conversas` com icone `MessageSquare` entre "Reativação" e "Config"
- Renderizar `LiveChatsPanel` no `TabsContent`

### 4. `supabase/functions/send-whatsapp/index.ts` (novo)
- Recebe `{ remote_jid, message }` com auth do owner
- Busca config Evolution de `crm_settings`
- Envia via Evolution API (mesmo padrao de `sendEvolutionMessage`)
- Salva em `crm_messages` como `whatsapp_saida`

### 5. `supabase/functions/evolution-webhook/index.ts` (editar)
- Apos verificar `iaPaused` (linha ~1263), adicionar check per-customer: buscar `ia_lock_at` do customer, se nao nulo e < 24h, pular resposta da IA (mas continuar salvando a mensagem de entrada em `crm_messages`)

### 6. Migration (nao necessaria)
- `ia_lock_at` e `ia_lock_reason` ja existem na tabela `customers`
- `crm_messages` ja tem `message_type` e `customer_id`

## Fluxo

1. Owner abre CRM > aba "Conversas"
2. Ve lista de clientes que conversaram com a IA
3. Clica num cliente > ve historico completo
4. Clica "Retomar" > IA para de responder aquele cliente
5. Digita mensagem > enviada via WhatsApp em nome da confeitaria
6. Clica "Voltar para IA" > IA retoma controle

