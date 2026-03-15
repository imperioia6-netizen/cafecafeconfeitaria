
# Melhorias do Agente Conversacional WhatsApp — IMPLEMENTADO ✅

## Melhorias Aplicadas

### 1. ✅ Sessões de Conversa (tabela `sessions`)
- Webhook carrega/cria sessão pelo `remote_jid` antes de chamar o atendente
- Contexto da sessão anterior é injetado na mensagem para o LLM
- Sessão é limpa após criação de pedido/encomenda

### 2. ✅ Histórico do Dono no WhatsApp
- Mensagens do dono são salvas em `messaages log` (entrada e saída)
- Últimas 12 mensagens são carregadas como `history` para `runAssistente`

### 3. ✅ Verificação de `ia_paused`
- Webhook verifica `crm_settings.ia_paused` antes de responder
- Se pausada: salva mensagem no CRM mas NÃO envia resposta automática

### 4. ✅ Processamento de `[ALERTA_EQUIPE]`
- `parseCreateBlocks` agora extrai `[ALERTA_EQUIPE]...[/ALERTA_EQUIPE]`
- Envia alerta via Evolution para todos os números em `ownerPhones`
- Remove o bloco da resposta enviada ao cliente

### 5. ✅ Otimização de Prompt
- Removida referência rápida de preços duplicada (usa só o cardápio detalhado)
- Cardápio detalhado truncado se > 4000 caracteres
- Regras de bolos por kg simplificadas no prompt base (detalhes só no bloco CARDÁPIO)

### 6. ✅ Integração `payment_confirmations`
- Pedidos e encomendas criados pelo WhatsApp registram em `payment_confirmations` com status `pending`
- Permite que o dono confirme pagamentos pelo painel

## Arquivos Editados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/evolution-webhook/index.ts` | Sessões, ia_paused, histórico dono, ALERTA_EQUIPE, payment_confirmations |
| `supabase/functions/_shared/agentLogic.ts` | Truncar cardápio, remover referência rápida duplicada |
| `supabase/functions/_shared/atendentePromptBase.ts` | Simplificar regras de bolos (detalhes no contexto) |
