# Instruções para Claude Code / IAs que abrirem este projeto

**LEIA PRIMEIRO:** [docs/AGENT_CONTRACT.md](docs/AGENT_CONTRACT.md)

Esse arquivo é o **contrato canônico** de como o agente WhatsApp deve se comportar. Qualquer correção, feature ou bugfix no agente deve respeitar o que está lá. Se o contrato está errado, corrige o contrato primeiro, depois o código.

## Contexto do projeto

Automação de atendimento WhatsApp para **Café Café Confeitaria** (Osasco-SP).
Stack: Vite + React + TypeScript + shadcn-ui + Tailwind. Backend no **Supabase** (Edge Functions em Deno + Postgres). Integração com **Evolution API** para WhatsApp.

O agente recebe mensagens em `supabase/functions/evolution-webhook`, passa por um pipeline de ~14 guardrails + LLM, persiste pedido em `payment_confirmations` e notifica a equipe.

## Regras inegociáveis ao trabalhar neste código

1. **Nunca alterar informações do estabelecimento** (cardápio, preços, horários, endereço, sabores, taxas). O proprietário é o único editor autorizado. Correções vão sempre em código/guardrails/prompt.

2. **Cada bug reportado vira um teste** em `src/test/agent/*.test.ts` ANTES do fix. Se você corrigir sem teste, a regressão vai voltar.

3. **Depois de qualquer mudança em `supabase/functions/`**, precisa `supabase functions deploy evolution-webhook --no-verify-jwt`. Sem deploy, a mudança não chega em produção.

4. **Nunca quebre o fluxo obrigatório** descrito em [AGENT_CONTRACT.md §2](docs/AGENT_CONTRACT.md). Pedido → "mais alguma coisa?" → fechamento → forma pagamento → PIX → comprovante.

5. **Interpretação é responsabilidade do código**, não do LLM. Se o LLM consegue errar, o guardrail TEM que pegar. Cada palavra rara que vira "sabor" errado = bug no `agentInterpreter.ts` ou em algum `enforce*` de `priceEngine.ts`.

## Arquivos-chave

- [`docs/AGENT_CONTRACT.md`](docs/AGENT_CONTRACT.md) — contrato de comportamento (LEIA!)
- [`supabase/functions/evolution-webhook/index.ts`](supabase/functions/evolution-webhook/index.ts) — entry point do WhatsApp
- [`supabase/functions/_shared/priceEngine.ts`](supabase/functions/_shared/priceEngine.ts) — maior parte dos guardrails
- [`supabase/functions/_shared/decisionLayer.ts`](supabase/functions/_shared/decisionLayer.ts) — prompt do LLM + preCalcular
- [`supabase/functions/_shared/agentInterpreter.ts`](supabase/functions/_shared/agentInterpreter.ts) — classificador determinístico de intent/entidades
- [`supabase/functions/_shared/teamSummary.ts`](supabase/functions/_shared/teamSummary.ts) — resumo determinístico pra equipe
- [`src/test/agent/`](src/test/agent/) — testes de contrato do agente

## Como rodar / testar

```bash
npm install
npm test                # 282+ testes agora, todos devem passar
npm run build           # valida TypeScript
```

## Deploy

```bash
# Pré-req: ./node_modules/.bin/supabase já instalado
./node_modules/.bin/supabase link --project-ref osewboiklhfiunetoxzo
./node_modules/.bin/supabase functions deploy evolution-webhook --no-verify-jwt
```

Ver detalhes em [`docs/AGENT_CONTRACT.md §7`](docs/AGENT_CONTRACT.md).
