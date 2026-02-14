

# CRM + Marketing Inteligente — Integrado com n8n

Tudo conforme o plano aprovado, mas substituindo Lovable AI por chamadas a **webhooks do n8n** para geração de mensagens e automações.

---

## Mudança Principal: n8n no lugar de Lovable AI

Em vez de uma edge function chamando o gateway de IA, o sistema usara:

- **Edge function `crm-n8n`** que recebe o tipo de acao (aniversario, reativacao, upsell, social_seller) e os dados do cliente
- Essa edge function faz um **POST para o webhook do n8n** configurado pelo usuario
- O n8n processa a logica de IA, automacao de mensagens, e retorna o resultado
- O usuario configura a URL do webhook do n8n nas **Configuracoes do CRM** dentro do app

---

## O que sera construido (mesmo escopo do plano aprovado)

### 1. Migration SQL
Criar todas as tabelas do CRM:

- **customers** — nome, telefone, email, instagram, seguidores, aniversario do cliente e familiar, canal preferido, produto favorito, ultima compra, total gasto, status (ativo/inativo/novo)
- **crm_messages** — tipo de mensagem, conteudo, status (pendente/enviada/lida), agendamento
- **social_leads** — funil de seguidores do Instagram com status de conversao
- **influence_discounts** — registro de descontos por influencia/seguidores
- **Coluna `customer_id`** na tabela `sales` (nullable)
- **Tabela `crm_settings`** — para armazenar a URL do webhook do n8n e configuracoes

### RLS Policies
- Owner: acesso total a todas as tabelas CRM
- Employee: leitura de clientes, criacao de vendas vinculadas

### 2. Edge Function `crm-n8n`
Uma unica edge function que:
- Recebe o tipo de acao: `aniversario_cliente`, `aniversario_familiar`, `reativacao`, `social_seller`, `upsell`
- Envia os dados do cliente (nome, produto favorito, dias sem comprar, etc.) para o webhook do n8n
- Recebe a resposta do n8n (mensagem gerada, acao sugerida)
- Salva na tabela `crm_messages`
- Trata erros de conexao e timeout

### 3. Hooks de Dados
- `useCustomers.ts` — CRUD de clientes, busca, filtros por status
- `useCrmMessages.ts` — Mensagens pendentes e enviadas
- `useSocialLeads.ts` — Funil social seller
- `useInfluence.ts` — Paga com influencia
- `useCrmSettings.ts` — Configuracao do webhook n8n

### 4. Pagina CRM (`/crm`)
Dashboard com abas:

**Aba Clientes:**
- Lista com busca e filtros (ativos, inativos 30d+, novos)
- Indicadores visuais: quente (compra recente), morno, frio (30d+ sem comprar)
- Card expandido com historico de compras, produto favorito, total gasto
- Botao "Cadastrar Cliente"

**Aba Aniversarios:**
- Timeline de aniversarios proximos (cliente + familiar)
- Fluxo de 6 mensagens automaticas
- Botao "Gerar Mensagem via n8n" que dispara o webhook
- Status de cada mensagem no fluxo

**Aba Reativacao:**
- Painel de clientes inativos (30d+ sem compra)
- Geracao automatica de oferta personalizada via n8n
- Marcacao como "oferta oculta"

**Aba Social Seller:**
- Funil visual: novo seguidor -> mensagem enviada -> convertido -> cliente
- Cadastro de leads do Instagram
- Disparo de oferta via n8n

**Aba Configuracoes:**
- Campo para URL do webhook do n8n
- Teste de conexao com o webhook
- Configuracoes de "Paga com Influencia" (regras de desconto por seguidores)

### 5. Componentes
- `CustomerCard.tsx` — Card com historico e indicador de temperatura
- `CustomerForm.tsx` — Formulario de cadastro
- `BirthdayTimeline.tsx` — Timeline de aniversarios
- `ReactivationPanel.tsx` — Painel de inativos
- `SocialFunnel.tsx` — Funil visual de conversao
- `N8nSettingsPanel.tsx` — Configuracao do webhook

### 6. Integracao na Pagina de Vendas
- Seletor opcional de cliente ao registrar venda
- Opcao de cadastrar cliente novo inline

### 7. Sidebar + Rota
- Item "CRM" no grupo Gestao (ownerOnly)
- Rota `/crm` no App.tsx

---

## Como funciona a integracao com n8n

```text
[App CRM] ---> [Edge Function crm-n8n] ---> [Webhook n8n]
                                                  |
                                            [n8n processa]
                                            [Gera mensagem IA]
                                            [Retorna resultado]
                                                  |
[App CRM] <--- [Edge Function crm-n8n] <--- [Resposta n8n]
       |
  [Salva em crm_messages]
  [Exibe no dashboard]
```

O usuario configura no app a URL do webhook do n8n. No n8n, ele monta os fluxos de automacao (pode usar OpenAI, Google Gemini, ou qualquer outro servico de IA dentro do n8n).

---

## Detalhes Tecnicos

### Edge Function `crm-n8n`
- Busca a URL do webhook na tabela `crm_settings`
- Faz POST com `{ action_type, customer_data }` para o n8n
- Usa `mode: "no-cors"` nao sera necessario pois e server-side
- Timeout de 30s para aguardar resposta do n8n
- Se o n8n nao responder, salva mensagem como "erro" e notifica o usuario

### Tabela `crm_settings`
```text
crm_settings
  - id, key (text unique), value (text)
  - Ex: key="n8n_webhook_url", value="https://meu-n8n.app/webhook/xxx"
  - Ex: key="influence_min_followers", value="5000"
  - Ex: key="influence_discount_percent", value="20"
```

### Design Visual
Tudo seguindo o padrao cinematografico existente:
- glass-card, shine-effect, gradientes dourados
- depth-shadow, glow-gold, font Playfair Display
- Indicadores de temperatura do cliente com cores (verde/amarelo/vermelho)

---

## Sequencia de Implementacao

1. Migration SQL (tabelas customers, crm_messages, social_leads, influence_discounts, crm_settings + alteracao em sales + RLS)
2. Edge function `crm-n8n` (webhook para n8n)
3. Hooks de dados (useCustomers, useCrmMessages, useSocialLeads, useInfluence, useCrmSettings)
4. Pagina CRM com todas as abas + componentes
5. Integracao na pagina de Vendas (vincular cliente)
6. Sidebar + rota

