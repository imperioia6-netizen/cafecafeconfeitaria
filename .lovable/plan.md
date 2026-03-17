

# Diagnóstico: Por que a IA ainda inventa produtos e ignora contexto

## O que está acontecendo

As mudanças do Cursor **estão no código** (confirmei linha por linha). Os dois problemas persistem por **duas razões técnicas**:

### Razão 1: Deploy pode não ter ocorrido
O GitHub Actions só faz deploy quando há push na branch `main`. Se o commit `6ef2bb0` (e os commits seguintes do Lovable) não foram pushed para `main`, a Edge Function em produção ainda roda o código **antigo** — sem REGRA #1, sem REGRA #2, sem o bloco de RECOMENDAÇÕES.

**Ação**: Fazer deploy da edge function `evolution-webhook` agora mesmo (posso fazer isso pelo Lovable).

### Razão 2: Falta `temperature: 0` na chamada do LLM
Atualmente o `callLlm` (linha 433) envia o payload ao modelo **sem o parâmetro `temperature`**. O default da maioria dos modelos é `temperature: 1.0` — o que dá liberdade criativa ao modelo para "inventar" coisas como "bolo de cenoura". Com `temperature: 0` (ou 0.1), o modelo fica muito mais obediente às instruções do prompt e menos propenso a alucinar produtos.

## Plano de correção

### 1. Adicionar `temperature: 0` no `callLlm` 
**Arquivo**: `supabase/functions/_shared/agentLogic.ts` (linha 433)

Mudar de:
```typescript
body: JSON.stringify({ model: config.model, messages }),
```
Para:
```typescript
body: JSON.stringify({ model: config.model, messages, temperature: 0 }),
```

### 2. Deploy da edge function `evolution-webhook`
Usar a ferramenta de deploy do Lovable para garantir que o código atualizado (REGRA #1, REGRA #2, temperature: 0) esteja rodando em produção.

### Resultado esperado
- `temperature: 0` elimina a criatividade que faz o modelo inventar "bolo de cenoura"
- Com o deploy feito, as regras de RECOMENDAÇÕES e CONVERSA CONTÍNUA passam a valer
- O modelo vai seguir estritamente a lista do cardápio ao recomendar produtos

