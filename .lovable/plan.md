
# CRM Profissional — Design Cinematografico + Kanban de Leads

Redesign completo do CRM para alinhar com o padrao visual do Dashboard (KPI cards com gradientes escuros, tipografia Playfair Display, animacoes staggered) e adicionar um sistema de quadro Kanban para gerenciar leads/negocios em andamento.

---

## 1. Redesign dos KPI Cards (CrmDashboardKpis.tsx)

Trocar os KPI cards atuais (simples, fundo claro) pelo mesmo padrao do Dashboard principal:
- Primeiro card com gradiente escuro marrom (igual ao "Faturamento" do Dashboard)
- Todos os cards com `card-cinematic`, `animate-fade-in` e delays staggered
- Icones com `animate-float` dentro de circulos
- Numeros grandes em `font-mono-numbers` com `glow-gold` no primeiro
- Sub-informacoes abaixo com formatacao identica ao Dashboard
- Grid 5 colunas em desktop, 2 em mobile

## 2. Nova Aba: Kanban de Leads

Adicionar uma nova aba "Pipeline" no CRM com um quadro Kanban visual para gerenciar leads e negocios em andamento.

**Colunas do Kanban:**
- **Novo Lead** — Primeiro contato, interesse inicial
- **Em Negociacao** — Proposta enviada, aguardando resposta
- **Proposta Aceita** — Fechamento proximo
- **Convertido** — Virou cliente (movido automaticamente ao vincular venda)

**Funcionalidades:**
- Cada card mostra: nome, telefone, valor potencial, dias no estagio, notas
- Botoes para mover lead entre colunas (avancar/retroceder)
- Contadores por coluna com valor total potencial
- Criar novo lead diretamente no kanban
- Ao converter, opcao de transformar em cliente no CRM

**Implementacao tecnica:**
- Reutilizar a tabela `social_leads` existente, adicionando novos status via migration: `novo_lead`, `em_negociacao`, `proposta_aceita`, `convertido`
- Adicionar colunas `potential_value` (numeric), `notes` (text), `stage_changed_at` (timestamptz) na tabela `social_leads`
- Novo componente `LeadsKanban.tsx`
- Atualizar `useSocialLeads.ts` para suportar os novos campos e status

## 3. Migration SQL

Alterar a tabela `social_leads` para suportar o Kanban:
- Adicionar valores ao enum ou usar text para status: `novo_lead`, `em_negociacao`, `proposta_aceita`, `convertido` (alem dos existentes)
- Adicionar colunas: `potential_value` (numeric default 0), `notes` (text), `name` (text), `phone` (text), `stage_changed_at` (timestamptz default now)

## 4. Redesign da Pagina CRM (Crm.tsx)

- Aplicar mesma estrutura do Dashboard: `space-y-8`, animacoes staggered
- KPIs com design identico ao Dashboard
- Nova aba "Pipeline" com icone Kanban (LayoutGrid ou Columns)
- Tabs com estilo aprimorado
- Melhorar estado vazio com design mais cinematografico

## 5. Melhorias Visuais nas Abas Existentes

**Aba Clientes:**
- Status badges com animacao ao trocar filtro
- Cards com hover mais pronunciado (depth-shadow)

**Aba Aniversarios:**
- Header com titulo em Playfair Display e gradiente
- Cards com border-shine nos aniversarios de hoje

**Aba Reativacao:**
- KPI cards de resumo com mesmo padrao do Dashboard (gradiente escuro no primeiro)
- Segmentacao visual mais pronunciada

**Aba Config:**
- Cards com gradientes sutis no header
- Status de conexao com animacao pulse

## 6. Componente LeadsKanban.tsx

Quadro Kanban com 4 colunas lado a lado (scroll horizontal em mobile):
- Cada coluna: header com titulo, contagem e valor total
- Cards arrastados visualmente com botoes de acao
- Dialog para criar/editar lead
- Design: colunas com fundo sutil diferente, cards com card-cinematic
- Cores por coluna: azul (novo), amarelo (negociacao), verde (proposta), dourado (convertido)

---

## Sequencia de Implementacao

1. Migration SQL — novos campos em `social_leads`
2. `useSocialLeads.ts` — atualizar hook com novos campos
3. `CrmDashboardKpis.tsx` — redesign com padrao do Dashboard
4. `LeadsKanban.tsx` — novo componente Kanban completo
5. `Crm.tsx` — nova aba Pipeline + redesign geral
6. Melhorias visuais nas abas existentes (Birthday, Reactivation, Config)

---

## Detalhes Tecnicos

### Tabela social_leads (alteracoes)
```text
ALTER TABLE social_leads
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS potential_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz DEFAULT now();
```
Status existentes serao mantidos e novos adicionados: `novo_lead`, `em_negociacao`, `proposta_aceita`.

### LeadsKanban.tsx
- Usa `useSocialLeads` para CRUD
- 4 colunas em flex horizontal com `overflow-x-auto`
- Cada coluna filtra leads por status
- Botao "Mover" atualiza status e `stage_changed_at`
- Dialog para criar lead com campos: nome, telefone, instagram, valor potencial, notas
- Card mostra: nome, valor, dias no estagio, badge de status, notas truncadas

### Design Visual
Tudo alinhado com o Dashboard existente:
- `card-cinematic`, `shine-effect`, `border-shine`
- Gradientes escuros marrom no card principal
- `font-mono-numbers` para valores
- `glow-gold` para destaque
- `animate-fade-in` com delays staggered
- Tipografia Playfair Display para titulos
