

# Plano de Melhorias: Agente Conversacional e Automações WhatsApp

## Análise do Estado Atual

O sistema atual tem uma arquitetura funcional mas com vários pontos que podem ser melhorados significativamente:

### Problemas Identificados

1. **Sem memória de sessão**: O atendente não mantém contexto entre mensagens do mesmo cliente de forma estruturada. O histórico vem de `crm_messages` mas não há "sessão" com estado do pedido em andamento.

2. **Tabela `sessions` existe mas não é usada**: Há uma tabela `sessions` no banco com campos `memory`, `status`, `type`, `remote_jid`, `total`, `address`, `payment_method` -- mas o `evolution-webhook` ignora completamente essa tabela.

3. **Histórico do dono é vazio**: Quando o dono manda mensagem pelo WhatsApp, `runAssistente` recebe `history: []` (linha 889), perdendo todo o contexto da conversa anterior.

4. **Sem verificação de IA pausada**: O campo `ia_paused` em `crm_settings` é configurável na UI (`SetupWhatsAppIA.tsx`) mas o webhook não verifica esse flag antes de responder.

5. **Bloco [ALERTA_EQUIPE] não é processado**: O prompt instrui a IA a emitir `[ALERTA_EQUIPE]`, mas `parseCreateBlocks` não extrai nem processa esse bloco -- nenhum alerta chega aos donos.

6. **Sem confirmação de pagamento pendente**: Pedidos são criados diretamente. A tabela `payment_confirmations` existe mas não é usada pelo fluxo do webhook.

7. **Prompt muito longo**: O prompt do atendente pode ultrapassar 15k tokens com cardápio + regras + instruções, desperdiçando tokens e aumentando latência.

---

## Correções e Melhorias Propostas

### 1. Ativar sessões de conversa (tabela `sessions`)
- No `evolution-webhook`, antes de chamar `runAtendente`, buscar/criar sessão na tabela `sessions` pelo `remote_jid`
- Salvar o estado do pedido em andamento (itens, endereço, método de pagamento) no campo `memory` (jsonb)
- Incluir o resumo da sessão no contexto enviado ao LLM para que ele "lembre" o que já foi combinado
- Após processar blocos `[CRIAR_PEDIDO]` / `[CRIAR_ENCOMENDA]`, marcar sessão como `concluida`

### 2. Corrigir histórico do dono no WhatsApp
- Buscar últimas mensagens trocadas entre o dono e o bot (usando `crm_messages` ou `messaages log`) antes de chamar `runAssistente`
- Passar como `history` para manter continuidade na conversa

### 3. Implementar verificação de `ia_paused`
- No webhook, antes de gerar resposta da IA, verificar `crm_settings` key `ia_paused`
- Se pausada: salvar mensagem no `crm_messages` mas NÃO enviar resposta automática
- Retornar `{ ok: true, paused: true }` sem chamar Evolution API

### 4. Processar bloco [ALERTA_EQUIPE]
- Adicionar extração de `[ALERTA_EQUIPE]...[/ALERTA_EQUIPE]` em `parseCreateBlocks`
- Quando presente, enviar mensagem via Evolution para todos os números em `ownerPhones` com o conteúdo do alerta
- Remover o bloco da resposta enviada ao cliente

### 5. Otimizar tamanho do prompt
- Mover a referência rápida de preços (que está duplicada no prompt E no cardápio detalhado) para usar apenas o cardápio detalhado
- Truncar o cardápio detalhado se ultrapassar 4000 caracteres
- Remover regras redundantes entre `atendentePromptBase.ts` e `agentLogic.ts`

### 6. Integrar `payment_confirmations`
- Quando a IA emitir `[CRIAR_PEDIDO]` ou `[CRIAR_ENCOMENDA]`, antes de criar diretamente, inserir em `payment_confirmations` com status `pending`
- Isso permite que o dono confirme pagamentos pelo painel antes de finalizar

---

## Arquivos Editados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/evolution-webhook/index.ts` | Sessões, ia_paused, histórico dono, ALERTA_EQUIPE, payment_confirmations |
| `supabase/functions/_shared/agentLogic.ts` | Otimizar prompt, remover duplicatas |
| `supabase/functions/_shared/atendentePromptBase.ts` | Remover regras duplicadas com agentLogic |

## Impacto

- Melhora significativa na continuidade das conversas (sessões)
- Donos recebem alertas quando a IA precisa de ajuda humana
- Possibilidade de pausar IA sem editar código
- Redução de custo de tokens (~30% menos no prompt)
- Zero breaking change para o cliente final

