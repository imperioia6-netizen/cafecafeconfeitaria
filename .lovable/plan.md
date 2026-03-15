

# Plano: Fluxo Completo de Aprovação/Recusa de Comprovantes

## Problema Atual
Hoje, quando a IA detecta `[CRIAR_PEDIDO]` ou `[CRIAR_ENCOMENDA]`, ela cria o pedido **E** insere em `payment_confirmations` simultaneamente (linhas 1042-1082 do webhook). Isso significa que o pedido já é registrado antes de qualquer aprovação. Além disso, ao clicar "Confirmar" ou "Recusar" na UI, apenas o status muda no banco -- nenhuma mensagem é enviada ao cliente e nenhum pedido é criado/bloqueado.

## Fluxo Desejado
1. Cliente envia comprovante no WhatsApp
2. IA detecta e insere em `payment_confirmations` com o payload do pedido/encomenda, **sem criar o pedido ainda**
3. No painel "Comprovar Pagamentos", aparece nome + telefone + descrição
4. **Confirmar** → cria o pedido/encomenda no sistema + IA envia mensagem de confirmação ao cliente via WhatsApp
5. **Recusar** → IA envia mensagem de recusa ao cliente: *"Infelizmente esse comprovante não bate com nossos dados, e não irei conseguir agendar o seu pedido! Poderia me mandar o comprovante corretamente? 😊"*

## Mudanças

### 1. Migração SQL: adicionar colunas a `payment_confirmations`
- `order_payload` (jsonb) -- armazena o JSON completo do pedido/encomenda para criar depois
- `remote_jid` (text) -- identificador WhatsApp para enviar mensagem de volta

### 2. Edge Function: `confirm-payment` (nova)
Recebe `{ id, action: "confirmed" | "rejected" }` e:
- **Se confirmed**: lê `order_payload` e `type`, chama `createOrderFromPayload` ou `createEncomendaFromPayload`, envia mensagem de confirmação via Evolution
- **Se rejected**: envia mensagem de recusa via Evolution: *"Infelizmente esse comprovante não bate com nossos dados..."*
- Atualiza `payment_confirmations.status` e `decided_at`

### 3. `evolution-webhook/index.ts` (modificar)
- Quando detectar `pedidoJson` ou `encomendaJson`: inserir em `payment_confirmations` com `order_payload` e `remote_jid`, **remover** as chamadas a `createOrderFromPayload` / `createEncomendaFromPayload`
- A IA responde ao cliente que o comprovante foi recebido e está sendo analisado

### 4. `ConfirmPayments.tsx` (modificar)
- Ao clicar Confirmar/Recusar: chamar a edge function `confirm-payment` em vez de fazer update direto no banco
- Mostra nome e telefone do cliente de forma clara (já faz isso)

## Arquivos Editados/Criados

| Arquivo | Mudança |
|---|---|
| Migração SQL | Adicionar `order_payload` jsonb e `remote_jid` text a `payment_confirmations` |
| `supabase/functions/confirm-payment/index.ts` | Nova edge function para processar aprovação/recusa |
| `supabase/functions/evolution-webhook/index.ts` | Parar de criar pedido imediatamente, salvar payload no payment_confirmations |
| `src/pages/ConfirmPayments.tsx` | Chamar edge function ao confirmar/recusar |
| `supabase/config.toml` | Registrar nova function `confirm-payment` |

