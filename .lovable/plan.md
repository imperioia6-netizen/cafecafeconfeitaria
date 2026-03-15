

# Plano: Correções de Regras do Agente WhatsApp + Limpeza de Dados Antigos

## Problemas Identificados

1. **Taxa de decoração errada**: Está R$ 25 no prompt, deveria ser **R$ 30**.
2. **Regra de bolo meio-a-meio incompleta**: O prompt diz "mínimo 1kg de cada sabor" mas não explica que o peso é SEMPRE dividido igualmente (2kg = 1kg+1kg, 4kg = 2kg+2kg).
3. **Regra de bolo de frutas imprecisa**: Diz "evite agendar com mais de 1 dia", mas deveria ser mais explícita: encomenda de bolo de frutas **no máximo** 1 dia antes.
4. **Prazo de pedidos**: Precisa reforçar que pedidos para o mesmo dia são aceitos **somente até 12h**.
5. **Bolos do Dia (R$ 25/fatia)** não estão no prompt: lista de sabores de massa branca e massa de chocolate com preço R$ 25 por fatia.
6. **IA respondendo de número de teste**: A IA está usando dados salvos de sessões/histórico antigos (tabela `sessions`, `messaages log`, `crm_messages`). Quando o número da instância Evolution foi trocado para testes, os dados antigos fizeram a IA "lembrar" conversas do número errado. O problema é que a **sessão** e o **histórico** ficam vinculados ao `remote_jid` do cliente, não ao número do bot. A IA respondeu normalmente -- o problema real é que a instância Evolution estava configurada com o número de teste, então as respostas saíam desse número. Isso não é um bug de código, é configuração da instância Evolution. Porém, podemos adicionar proteção para limpar sessões antigas automaticamente.

## Mudanças

### 1. `atendentePromptBase.ts` — Corrigir regras fixas
- **Decoração**: R$ 25 → **R$ 30**
- **Meio-a-meio**: Adicionar regra clara de divisão igualitária do peso
- **Frutas**: Reforçar limite de 1 dia de antecedência no máximo
- **Pedidos mesmo dia**: Reforçar "somente até 12h"
- **Bolos do Dia**: Adicionar seção com lista de sabores (massa branca: Chocomix, Ninho, Ninho c/ Morango, Cocada, Bem Casado, Casadinho, Frutas, Ameixa; massa de chocolate: Brigadeiro, Prestígio, Dois Amores, Maracujá c/ Brigadeiro) a R$ 25/fatia
- Adicionar lista extra de sabores do dia da foto: Trufado, Jufeh, Trufado c/ Ninho, Napolitano, Tentação, Floresta, Delícia de Coco, Nozes, Mia, Ouro Branco

### 2. `evolution-webhook/index.ts` — Proteção contra sessões velhas
- Ao carregar sessão, verificar se `updated_at` tem mais de 24h. Se sim, limpar `memory` para não contaminar conversas com contexto antigo/obsoleto
- Isso evita que dados de testes ou conversas muito antigas influenciem novas interações

### 3. `agentLogic.ts` — Ajuste no bloco de preço de bolos
- Garantir que a regra de meio-a-meio no cálculo de preço está correta (cada metade usa o preço/kg do respectivo sabor)

## Arquivos Editados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/_shared/atendentePromptBase.ts` | Decoração R$30, meio-a-meio, frutas 1 dia max, pedidos até 12h, bolos do dia |
| `supabase/functions/evolution-webhook/index.ts` | Expirar sessões com mais de 24h |
| `supabase/functions/_shared/agentLogic.ts` | Regra de preço meio-a-meio no bloco de cálculo |

