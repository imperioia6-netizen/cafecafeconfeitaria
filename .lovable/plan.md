

# CRM + Marketing Inteligente para Cafe Cafe

Bloco completo de CRM com foco em retenção, reativação e conversão de clientes. Tudo integrado com IA (Lovable AI) para gerar mensagens humanizadas.

---

## O que será construído

### 1. Tabela de Clientes (customers)
- Nome, telefone, email, Instagram, seguidores
- Data de aniversário do cliente
- Nome e aniversário do familiar mais próximo
- Canal preferido (balcão/delivery)
- Produto favorito (calculado automaticamente pelo histórico)
- Data da última compra
- Total gasto acumulado
- Status: ativo / inativo / novo

### 2. Vinculação de Vendas a Clientes
- Campo `customer_id` na tabela `sales` (opcional, para vendas identificadas)
- Ao registrar venda, opção de vincular a um cliente existente ou cadastrar novo

### 3. Página CRM (/crm)
Nova página no sidebar do owner com:
- Lista de clientes com busca e filtros (ativos, inativos 30d+, novos)
- Card de cliente com: histórico de compras, produto favorito, total gasto, dias desde última compra
- Botão "Cadastrar Cliente" com formulário
- Indicadores visuais: cliente quente (comprou recente), morno, frio (30d+ sem comprar)

### 4. Fluxo de Aniversário (6 notificações)
Tabela `crm_messages` para rastrear mensagens enviadas/pendentes:
- 6 dias antes: "Falta 6 dias para o aniversário de [familiar]! Vamos preparar uma surpresa?"
- 5 dias antes: Sugestão de cardápio para festa
- 3 dias antes: "Ainda dá tempo! Temos uma promoção especial para você comemorar"
- 1 dia antes: "Amanhã é o grande dia! Reserve seu bolo com 15% OFF"
- No dia: "Feliz aniversário! Presente especial esperando por você"
- Pós-aniversário: "Como foi a comemoração? Queremos ver as fotos!"

O mesmo fluxo para o aniversário do próprio cliente.

### 5. Reativação de Cliente Inativo (30 dias)
- Sistema identifica automaticamente clientes sem compra há 30+ dias
- Gera mensagem personalizada via IA: "Amamos ter você como cliente! Sabe aquele [produto favorito] que você sempre pedia? Temos 30% de desconto SÓ PRA VOCÊ. Isso não está em promoção na loja."
- Mensagem marcada como "oferta oculta" (não aparece no cardápio geral)

### 6. Funil Social Seller
Tabela `social_leads` para rastrear novos seguidores:
- Cadastro manual ou futura integração
- Fluxo: Seguiu -> Mensagem automática com 30% cashback -> "Pague 1kg leve 1kg700"
- Status: novo_seguidor -> mensagem_enviada -> convertido -> cliente

### 7. Upsell por IA
- Edge function que analisa os dados de vendas e cruza: "80% dos clientes que pedem bolo de morango também pedem suco natural"
- Gera copy pronta para o Vitor passar aos vendedores
- Dashboard mostra: "Esses 40% de upsell não estão entrando. Por que?"

### 8. Paga com Influência
- Campo `instagram_followers` no cliente
- Regra configurável: X seguidores = Y% de desconto na comanda
- Ex: 5000+ seguidores + 1 post = 20% off
- Registro do post como comprovante

### 9. Edge Function de IA para Mensagens
Uma edge function `crm-ai` que usa Lovable AI para:
- Gerar mensagens de aniversário humanizadas
- Gerar mensagens de reativação personalizadas com o produto favorito
- Gerar copy de upsell para vendedores
- Gerar scripts de Social Seller

---

## Detalhes Técnicos

### Banco de Dados (Migration SQL)

**Novas tabelas:**

```text
customers
  - id, name, phone, email, instagram_handle, instagram_followers
  - birthday, family_name, family_birthday
  - preferred_channel, favorite_recipe_id
  - last_purchase_at, total_spent, status (ativo/inativo/novo)
  - created_at, updated_at

crm_messages
  - id, customer_id, message_type (aniversario_cliente, aniversario_familiar, reativacao, social_seller, upsell)
  - message_content, status (pendente/enviada/lida)
  - scheduled_for, sent_at, created_at

social_leads
  - id, instagram_handle, followers_count
  - status (novo_seguidor, mensagem_enviada, convertido, cliente)
  - customer_id (nullable, vincula quando converte)
  - offer_sent, converted_at, created_at

influence_discounts
  - id, customer_id, instagram_post_url
  - followers_at_time, discount_percent, sale_id
  - created_at
```

**Alterações em tabelas existentes:**
- `sales` ganha coluna `customer_id` (nullable, FK para customers)

### RLS Policies
- Owner: acesso total a todas as tabelas CRM
- Employee: leitura de clientes, criação de vendas vinculadas
- Clientes não têm acesso direto ao CRM

### Novos Arquivos

**Hooks:**
- `src/hooks/useCustomers.ts` — CRUD de clientes, busca, filtros
- `src/hooks/useCrmMessages.ts` — Mensagens pendentes/enviadas
- `src/hooks/useSocialLeads.ts` — Funil social seller
- `src/hooks/useInfluence.ts` — Paga com influência

**Páginas:**
- `src/pages/Crm.tsx` — Dashboard CRM principal com abas: Clientes, Aniversários, Reativação, Social Seller

**Componentes:**
- `src/components/crm/CustomerCard.tsx` — Card de cliente com histórico
- `src/components/crm/CustomerForm.tsx` — Formulário de cadastro
- `src/components/crm/BirthdayTimeline.tsx` — Timeline de aniversários próximos
- `src/components/crm/ReactivationPanel.tsx` — Painel de clientes inativos
- `src/components/crm/SocialFunnel.tsx` — Funil visual de conversão

**Edge Function:**
- `supabase/functions/crm-ai/index.ts` — Geração de mensagens via Lovable AI

**Modificações:**
- `src/pages/Sales.tsx` — Adicionar seletor de cliente na venda
- `src/components/layout/AppSidebar.tsx` — Adicionar item "CRM" no menu
- `src/App.tsx` — Adicionar rota /crm

### Sidebar
Nova entrada no grupo "Gestão":
- CRM (icone: Heart ou Users) — ownerOnly: true

---

## Sequência de Implementação

1. Migration SQL (tabelas + RLS)
2. Edge function `crm-ai`
3. Hooks de dados
4. Página CRM com todas as abas
5. Componentes individuais
6. Integração na página de Vendas (vincular cliente)
7. Sidebar + rota

Tudo seguindo o design cinematográfico já estabelecido (glass-card, shine-effect, gradientes dourados, depth-shadow).
