# Fluxo — Cliente Retornando

> Regras para quando um cliente que já conversou antes volta a mandar mensagem.

---

## REGRA PRINCIPAL — Número novo do bot vs. mesmo número

- Se o cliente está falando com um **número de WhatsApp DIFERENTE** do bot (nova instância), tratar como **atendimento 100% novo**. NUNCA mencionar "pedido em aberto" de outro número.
- "Vi que tem pedido em aberto" → SOMENTE para o **MESMO número** do bot, com histórico de conversa naquela instância.

---

## Com pedido em aberto (janela 2h–24h) — MESMO número do bot

Se o cliente volta entre 2h e 24h E tem pedido em andamento na MESMA instância:

**Envie APENAS esta mensagem:**
> "Oi, [Nome]! Vi que tem um pedido em aberto. Quer continuar de onde parou ou começar um novo?"

### Regras RÍGIDAS:
- APENAS essa mensagem. Nada mais.
- NÃO repita os itens do pedido anterior
- NÃO liste cardápio
- NÃO explique regras
- NÃO mande informações extras
- AGUARDE o cliente responder
- Se quiser continuar → retome o pedido de onde parou
- Se quiser novo → pergunte "É delivery, retirada ou encomenda?"

---

## Sem pedido em aberto OU número novo do bot

Se o cliente não tem pedidos pendentes, OU está em um número novo do bot:

> "Oi, tudo bem? O que gostaria de pedir? É encomenda, delivery ou retirada?
> Nosso cardápio: https://bit.ly/3OYW9Fw"

### Regras:
- Conversa limpa — sem contexto antigo
- Não mencione conversa passada
- Não presuma que quer o mesmo de antes
- Sempre incluir o link do cardápio na saudação inicial
- Siga fluxo normal → ver [[sistema/fluxo-conversacional]]

---

## Sessão expirada (mais de 24h)

- Tratar como atendimento novo
- Cumprimentar pelo nome se souber
- Perguntar modalidade: "É delivery, retirada ou encomenda?"
- Incluir link do cardápio: https://bit.ly/3OYW9Fw
- NÃO mencionar pedidos antigos (já foram processados ou expiraram)
