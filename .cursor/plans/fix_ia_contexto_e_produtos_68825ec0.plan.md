---
name: Fix IA contexto e produtos
overview: "Corrigir dois problemas criticos: (1) a IA continua inventando produtos porque o deploy via GitHub Actions pode nao ter incluido os arquivos _shared corretamente, e o prompt precisa ser mais agressivo; (2) a IA nao mantem o contexto da conversa porque o historico de 12 mensagens e insuficiente e a mensagem atual chega isolada sem \"resumo\" do que esta acontecendo na conversa."
todos:
  - id: prompt-sandwich
    content: Adicionar regra de restricao de produtos no TOPO e no FINAL do prompt (sandwich technique) em agentLogic.ts
    status: completed
  - id: context-instruction
    content: Adicionar instrucao de conversa continua no system prompt em agentLogic.ts
    status: completed
  - id: history-limit
    content: Aumentar historico de 12 para 20 mensagens em callLlm (agentLogic.ts) e na query de crm_messages (evolution-webhook/index.ts)
    status: completed
  - id: push-deploy
    content: Commit + push para disparar deploy via GitHub Actions
    status: completed
isProject: false
---

# Corrigir IA: produtos inventados + falta de contexto

## Problema 1: IA continua recomendando produtos que nao existem

Apesar das regras adicionadas em `agentLogic.ts`, a IA continua recomendando "bolo de cenoura", "torta de limao", "bolo de chocolate com recheio de morango" -- nenhum deles existe no cardapio.

**Causa raiz:**

- O modelo LLM (Gemini Flash ou GPT-4o) tem forte tendencia a "completar" com produtos comuns de confeitaria, ignorando instrucoes longas enterradas no meio do prompt.
- O prompt e muito grande (centenas de linhas). As regras de restricao de produtos estao no meio e ficam "diluidas".
- Solucao: colocar a restricao de produtos no **TOPO** do prompt (antes de tudo), repetir no **FINAL** (sandwich technique), e tornar o texto mais enfatico.

**Alteracoes em [agentLogic.ts](supabase/functions/_shared/agentLogic.ts):**

1. No `buildAtendentePrompt`, adicionar **no inicio** do return (antes do `basePrompt`) uma regra curta e contundente:

```
REGRA #1 (PRIORIDADE MAXIMA): Voce SO pode citar, recomendar ou mencionar produtos que estejam na lista "CARDAPIO E PRECOS" deste prompt. Se um produto NAO esta na lista, ele NAO EXISTE. Nunca invente sabores como "bolo de cenoura", "torta de limao" etc. se nao estiverem na lista.
```

1. No final do prompt (apos tudo, antes do ultimo backtick), repetir:

```
LEMBRETE FINAL: Antes de citar qualquer produto, confira se ele esta na lista "CARDAPIO E PRECOS". Se nao estiver, NAO cite. Isso inclui recomendacoes.
```

## Problema 2: IA nao mantem contexto da conversa

A IA responde cada mensagem como se fosse isolada. Ex: cliente diz "quero fazer um pedido", depois "pode entregar agora?", depois "qual voce me recomenda" -- e a IA nao conecta as perguntas.

**Causa raiz:**

- O historico carrega apenas 12 mensagens de `crm_messages` (linha 1000 do `evolution-webhook/index.ts`), o que e adequado.
- Porem, em `callLlm` (linha 411 de `agentLogic.ts`), o historico e cortado novamente para `.slice(-12)` e cada mensagem para `.slice(0, MAX_MESSAGE_LENGTH)` (4096 chars). Isso funciona.
- O problema real e que o **system prompt e extremamente longo** (facilmente 8000+ tokens), o que faz o modelo "esquecer" o historico. Os modelos LLM dao prioridade ao system prompt e a mensagem atual, e o historico no meio fica comprimido.
- Alem disso, a mensagem atual (`enrichedMessage`) inclui o contexto da sessao (linha 1013), mas esse `sessionMemory` provavelmente esta vazio porque a IA nao gera blocos de sessao para salva-lo.

**Alteracoes em [agentLogic.ts](supabase/functions/_shared/agentLogic.ts):**

1. Aumentar o historico de 12 para **20** mensagens no `callLlm` (`.slice(-20)` em vez de `.slice(-12)`).
2. Adicionar no system prompt uma instrucao explicita: "Voce esta em uma CONVERSA CONTINUA. As mensagens anteriores (historico) sao da MESMA conversa. SEMPRE leia o historico inteiro antes de responder e mantenha coerencia com o que ja foi dito."

**Alteracoes em [evolution-webhook/index.ts](supabase/functions/evolution-webhook/index.ts):**

1. Aumentar o `.limit(12)` para `.limit(20)` na query de `crm_messages` (linha 1000).

## Problema 3: Deploy pode nao estar atualizando

O GitHub Actions workflow (`deploy-supabase-functions.yml`) faz `supabase functions deploy evolution-webhook`. Isso DEVE incluir os arquivos `_shared/` importados. Porem, para garantir, vamos tambem adicionar o deploy de `confirm-payment-action` e verificar que tudo esta correto.

## Resumo de arquivos

- `supabase/functions/_shared/agentLogic.ts`: regra de produtos no topo/final do prompt + instrucao de contexto + historico 20
- `supabase/functions/evolution-webhook/index.ts`: limit 12 -> 20

