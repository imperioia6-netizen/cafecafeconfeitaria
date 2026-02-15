

# Pedidos pelo Cardapio Digital (Sem Login)

## Objetivo

Transformar o cardapio digital (`/cardapio`) em uma experiencia completa de pedido online -- o cliente navega, monta seu carrinho, informa nome e telefone, e envia o pedido. O pedido aparece automaticamente na lista de pedidos abertos da equipe.

## Fluxo do Cliente

```text
Cardapio Digital (publico)
        |
        v
[Navega produtos] --> [Adiciona ao carrinho]
        |
        v
[Clica "Fazer Pedido"] --> [Informa nome + telefone]
        |
        v
[Confirma pedido] --> Edge Function (service_role)
        |
        v
[Pedido criado com status "aberto"]
        |
        v
Equipe ve na pagina /orders
```

## Alteracoes

### 1. Nova Edge Function: `supabase/functions/public-order/index.ts`

Como o cliente nao esta logado, as RLS policies bloqueiam inserts. Sera criada uma edge function que usa `service_role` para inserir o pedido de forma segura.

Recebe via POST:
- `customer_name` (obrigatorio)
- `customer_phone` (opcional)
- `items`: array de `{ recipe_id, quantity }`

A funcao:
- Valida que todos os `recipe_id` existem e estao ativos
- Busca o `sale_price` de cada receita (servidor, nao confia no frontend)
- Cria o pedido na tabela `orders` com `channel = 'cardapio_digital'`, `status = 'aberto'`
- Cria os `order_items` com preco do servidor
- Retorna o pedido criado com numero de confirmacao

Nao desconta estoque neste momento (estoque so e descontado na finalizacao pela equipe).

### 2. Migracao de banco de dados

- Adicionar `'cardapio_digital'` ao enum `sales_channel` para identificar pedidos vindos do cardapio online
- Adicionar coluna `customer_phone text` na tabela `orders` para contato do cliente

### 3. Cardapio atualizado: `src/pages/Cardapio.tsx`

Adicionar ao cardapio existente:

**Carrinho flutuante (barra inferior)**
- Aparece quando ha itens no carrinho
- Mostra quantidade total e valor
- Botao "Fazer Pedido" abre dialog de confirmacao

**Controle de quantidade nos cards**
- Ao clicar no botao "+", adiciona ao carrinho
- Quando ja tem no carrinho, mostra botoes "-" e "+" com quantidade no meio
- Estilo visual vermelho consistente com o tema iFood

**Dialog de confirmacao do pedido**
- Campo nome do cliente (obrigatorio)
- Campo telefone (opcional)
- Resumo dos itens com quantidades e subtotais
- Total do pedido
- Botao "Confirmar Pedido"
- Ao confirmar, chama a edge function `public-order`

**Tela de sucesso**
- Apos enviar com sucesso, mostra mensagem de confirmacao
- "Seu pedido foi enviado! Aguarde o preparo."
- Botao para fazer novo pedido (limpa o carrinho)

### 4. Tipo atualizado: `src/integrations/supabase/types.ts`

- Atualizar o enum `sales_channel` para incluir `'cardapio_digital'`

## Detalhes Tecnicos

- A edge function usa `createClient` com `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS
- Validacao server-side: precos vem do banco, nao do frontend
- O `operator_id` no pedido sera preenchido com um UUID fixo do sistema (ou null se alterarmos a constraint) -- sera tratado na edge function
- Nenhuma autenticacao necessaria no frontend
- O carrinho e mantido em estado local (useState), sem persistencia

