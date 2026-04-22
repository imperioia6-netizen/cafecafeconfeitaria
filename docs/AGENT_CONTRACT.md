# Contrato do Agente — Café Café Confeitaria

Este é o **contrato canônico** de comportamento do agente WhatsApp. Qualquer correção futura (código, prompt, teste) **DEVE** respeitar este documento. Se algo aqui estiver errado, corrija AQUI primeiro, depois reflita nos arquivos abaixo.

Este arquivo sobrevive entre máquinas (está no repo). Qualquer IA abrindo o projeto tem que ler este contrato ANTES de mexer no agente.

## Regra de ouro

**O agente NÃO inventa. Só usa o que está no cardápio, no contexto pré-calculado, ou no que o cliente explicitamente disse.**

---

## 1. Interpretação de mensagens do cliente

### 1.1 Sabor só do cardápio
- "Sabor" é SOMENTE um nome presente no [CARDÁPIO E PREÇOS].
- Se o cliente escreveu algo que NÃO é um nome do cardápio → NÃO é sabor. PERGUNTE, não afirme nem rejeite.
- Palavras JAMAIS são sabor: `amanha as`, `as 13hrs`, `pra hoje`, `amo você`, `em cima do bolo`, `com flores`, `colorida`, `segunda`, `pix`, `4kg` (é peso), `ser`, `é`, `de`, `pra`, números isolados.
- Tolerar typos (`amanhaas`, `13hrs`, `hj`).

### 1.2 Decoração ≠ sabor
- "Flores", "colorida", "bolinhas", "tema X", nomes de personagens = **decoração** (+R$30).
- NUNCA escrever "Bolo de flores" no resumo. Sempre "Bolo [sabor real] com decoração [descrição]".

### 1.3 Escrita ≠ sabor
- "Escrita em cima do bolo amo voce" → `amo voce` é o **TEXTO** da escrita (+R$15), não sabor.
- "Com a frase X" / "com os dizeres X" / "escrever X" → X é a frase.
- A FRASE literal precisa aparecer no resumo: `escrita "amo voce" (+R$15)`.

### 1.4 Contexto temporal
- Frases sobre horário/data NÃO viram sabor/item. Apenas confirmam quando.
- Ex: "pode ser as 9 de amanhã" → confirma horário da encomenda.

### 1.5 Interpretação de saudação
- "Oi", "olá", "bom dia", "boa tarde", "opa" → trate como INÍCIO.
- Cumprimente simples. NÃO reative pedido antigo, NÃO repita preços/chave PIX/desculpas.
- Se tem pedido realmente pendente (`status=pendente`, não aceito), aí pergunta "quer continuar?".
- Pedido em `50_pago`/`em_producao`/`entregue` = fechado, não conta.

---

## 2. Fluxo obrigatório do pedido

```
  (1) cliente pede item                            [bolo sabor X, peso Y kg / N salgados / etc.]
  (2) agente anota e pergunta "mais alguma coisa?" [NUNCA pule esta etapa]
  (3) cliente responde "só isso" / "pode fechar"   [ou pede mais item e volta pra 1]
  (4) se ENCOMENDA: pergunta "entrega ou retirada?" [se 4kg → força retirada]
  (5) agente pergunta forma de pagamento
  (6) cliente escolhe (PIX / dinheiro / cartão)
  (7) agente envia chave PIX + valor do sinal 50%
  (8) cliente envia comprovante
  (9) agente responde CURTO aguardando verificação pela equipe
```

**Pular etapas = ERRO GRAVE.**

### 2.1 "Mais alguma coisa?" antes de QUALQUER fechamento
- SEMPRE antes de perguntar forma de pagamento.
- SEMPRE antes de enviar chave PIX.
- SEMPRE antes de pedir endereço.
- SEMPRE antes de listar "Total:" pra fechar.

### 2.2 Depois do PIX + confirmação curta
- Cliente responde "ok", "beleza", "vou fazer", "pode deixar", "é isso", 👍 → resposta tem ~50 chars: *"Beleza! Fico no aguardo do seu comprovante 😊"*.
- PROIBIDO: repetir resumo, re-listar itens, reenviar chave, pedir desculpa de novo.

### 2.3 Encomenda → entrega OU retirada
- Antes de pedir endereço ou fechar, sempre perguntar.
- **Exceção**: bolo de 4kg → SEMPRE retirada. Não pergunta, informa direto: "Bolo de 4kg é somente para retirada 😊".

---

## 3. Resumo do pedido (cliente)

Cada linha do resumo TEM que ter item + valor na MESMA linha:

✅ `- Bolo Trufado 5kg — R$545,00`
❌ `- R$545,00` (picotado, sem item)
❌ `- 13 empadas de frango — R$47,50` (cliente pediu 50)

- Quantidade = EXATAMENTE a que o cliente falou.
- Soma aritmética dos itens = Total. Se não bate, refaça.
- Sem duplicação: mesmo item não aparece 2x.
- Se faltou um item, REESCREVA o resumo inteiro — não emende.

---

## 4. Resumo pra equipe (notificação em `payment_confirmations`)

**Determinístico** via [`teamSummary.ts`](../supabase/functions/_shared/teamSummary.ts). Nunca deixar o LLM montar essa mensagem.

Estrutura fixa:

```
👤 Cliente: Nome (telefone)
📦 Tipo: encomenda | pedido
🚚 Modalidade: ENTREGA (delivery) | 🏪 RETIRADA na loja | ❓ NÃO DEFINIDA
🎂 Bolo: <Sabor> <Peso> — decoração <X>, escrita "<frase>" (+R$15)
🥟 Salgados: 25× mini coxinha, 50× empada de frango
🍬 Doces: 50× brigadeiro
📝 Obs: <texto>
💳 Total: R$ <valor> (sinal 50%: R$ <X> pago) via <método>
📅 Entrega: <data> às <hora>
📍 Endereço: <endereço completo>
```

Regras de extração:
- Sabor vem do cardápio (não inventa).
- Frase da escrita: extraída LITERALMENTE do histórico.
- Modalidade: campo explícito > endereço preenchido > histórico.
- Itens deduplicados. Brigadeiro/beijinho ambíguo: `whole + qtd ≤ 4` OU "bolo brigadeiro" no histórico → bolo; senão doce.

---

## 5. Preços

- Todo R$ vem do [CARDÁPIO E PREÇOS] ou dos [CÁLCULOS PRÉ-FEITOS]. ZERO chute.
- Fórmula bolo: `preço_por_kg × peso`. Ex: Trufado R$129/kg × 2kg = R$258,00.
- Formato BRL: `R$258,00` (uma vírgula decimal). `R$1.234,56` se tiver milhar.
- NUNCA `R$15,008,00` (duas vírgulas = formato inválido).
- NUNCA valores absurdos (> R$8.000 pra um item = suspeito).

### Valores fixos
- Decoração colorida (temas, flores, personagens): +R$30.
- Escrita personalizada: +R$15 (só se o cliente pediu).
- Papel de arroz: R$30 (cliente TRAZ a arte impressa).
- Mini salgado: R$175/cento (múltiplo de 25 por sabor).
- Fatia: R$25.
- Entrada 50% exigida se total > R$300.
- Mínimo delivery: R$50.
- Bolo 4kg = só retirada.
- Só kg inteiro (1, 2, 3, 4).

### Horário
- Loja: 07:30 – 19:30, seg a sáb. Domingo fechado.
- Delivery: a partir das 09:00.

---

## 6. Mapa de execução — como cada regra vira código

| Regra | Camada(s) | Arquivo |
|---|---|---|
| Sabor só do cardápio | Guardrail + Prompt | [priceEngine.ts:enforceNoFragmentAsFlavor](../supabase/functions/_shared/priceEngine.ts) |
| Decoração ≠ sabor | Guardrail + Alerta | [priceEngine.ts:messageMentionsDecoration](../supabase/functions/_shared/priceEngine.ts) |
| Escrita ≠ sabor | Guardrail + Alerta | [priceEngine.ts:messageIsAboutWriting](../supabase/functions/_shared/priceEngine.ts) |
| Contexto temporal | Alerta | [priceEngine.ts:messageIsAboutTime](../supabase/functions/_shared/priceEngine.ts) |
| Saudação não reativa | Guardrail | [priceEngine.ts:enforceGreetingReset](../supabase/functions/_shared/priceEngine.ts) |
| Fluxo obrigatório | Pipeline | [evolution-webhook/index.ts](../supabase/functions/evolution-webhook/index.ts) |
| "Mais alguma coisa?" antes | 2 Guardrails | `enforceAskBeforePayment` + `enforceAskMoreBeforeClosure` |
| Depois do PIX + ok | Guardrail | `enforceNoRepeatAfterPix` |
| Encomenda → entrega/retirada | Guardrail | `enforceEncomendaDeliveryQuestion` |
| Resumo com item+valor na linha | Guardrail | `enforceOrderSummarySanity` |
| Qtd trocada | Guardrail | `enforceOrderSummarySanity` |
| Item esquecido | Guardrail | `enforceOrderSummaryCompleteness` |
| Resumo pra equipe determinístico | Módulo | [teamSummary.ts](../supabase/functions/_shared/teamSummary.ts) |
| Preço absurdo | Guardrail | `enforceSanePrices` |
| Mensagem repetida | Guardrail | `enforceNoExactRepeat` |
| Escrita fantasma | Guardrail | `enforcePhantomWritingRemoval` |
| Sabor alucinado | Guardrail | `enforceReplyGuardrails` |
| Interpretação de intent | Módulo | [agentInterpreter.ts](../supabase/functions/_shared/agentInterpreter.ts) |
| Alinhamento intent × resposta | Guardrail | `enforceIntentAlignment` |

Pipeline completo em [evolution-webhook/index.ts](../supabase/functions/evolution-webhook/index.ts), linhas ~852-913.

---

## 7. Deploy

**Mudar código local ≠ agente atualizado.** Após qualquer correção:

```bash
./node_modules/.bin/supabase functions deploy evolution-webhook --no-verify-jwt
```

Sem isso, o WhatsApp continua usando a versão antiga.

Para deploy de todas as funções do agente (recomendado após mudanças em `_shared/`):

```bash
./node_modules/.bin/supabase functions deploy evolution-webhook --no-verify-jwt
./node_modules/.bin/supabase functions deploy agent-chat
./node_modules/.bin/supabase functions deploy confirm-payment --no-verify-jwt
./node_modules/.bin/supabase functions deploy send-whatsapp
```

Project ref: `osewboiklhfiunetoxzo` (já linkado via `supabase/config.toml`).

---

## 8. Processo de correção de bug

Quando aparecer um bug novo:

1. **Reproduzir em teste** — `src/test/agent/<cenario>.test.ts`. Cada screenshot do cliente vira um caso de teste. Teste RED antes do fix.
2. **Corrigir na camada certa**:
   - Extração de dados → `conversationMemory.ts` / `agentInterpreter.ts`
   - Comportamento da resposta → novo guardrail em `priceEngine.ts`
   - Regra que LLM esquece → reforço no prompt em `decisionLayer.ts`
   - Mensagem pra equipe → `teamSummary.ts`
3. **Atualizar este contrato** — adicionar a regra na seção relevante.
4. **Testar** — `npm test` tudo verde.
5. **Commit + push + deploy** — os 3 passos, não pule nenhum.

---

## 9. Informações do estabelecimento (NÃO ALTERAR)

Tudo sobre cardápio, preços, horários, endereço, regras de negócio, sabores, taxas de entrega, decoração, escrita, formas de pagamento — fica em:

- Banco Supabase (`recipes`, `delivery_zones_disponibilidade`, `crm_settings`, `knowledge_base`)
- Vault Obsidian (`Obsidian Vault/`)
- Prompt do decisionLayer (seção "INFORMAÇÕES OPERACIONAIS FIXAS")

Essas informações são **editadas apenas pelo proprietário**. Qualquer IA corrigindo bugs deve trabalhar em **código**, nunca alterar conteúdo.
