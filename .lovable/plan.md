

# Adicionar campo Endereço + Nova aba "Fichas" no CRM

## O que será feito

### 1. Banco de dados
- Adicionar coluna `address` (text, nullable) na tabela `customers`.

### 2. Formulário de cliente (`CustomerForm.tsx`)
- Adicionar campo "Endereço" ao formulário de cadastro/edição.
- Remover campos "Familiar" e "Aniversário familiar" para simplificar (manter apenas: Nome, Telefone, Email, Aniversário, Endereço, Canal Preferido).

### 3. Tipo Customer (`useCustomers.ts`)
- Adicionar `address: string | null` à interface `Customer`.

### 4. Nova aba "Fichas" no CRM (`Crm.tsx`)
- Criar uma nova aba entre "Clientes" e "Pipeline" chamada **"Fichas"** (ícone de ficha/contato).
- Essa aba mostra apenas clientes que têm dados completos de cadastro (nome + pelo menos telefone ou email + aniversário preenchido) — ou seja, fichas com informações reais, não apenas contatos importados do WhatsApp.
- Cada ficha exibe: Nome, Telefone, Email, Aniversário, Endereço — em formato de card/ficha visual.

### 5. Componente de ficha (`CustomerFichaCard.tsx`)
- Novo componente simples exibindo os dados do cliente em formato de ficha (card com campos visíveis: nome, telefone, email, aniversário, endereço).

### 6. Detalhes do cliente (`CustomerDetailSheet.tsx`, `CustomerCard.tsx`)
- Exibir endereço quando disponível.

## Arquivos editados
- Migration SQL (adicionar coluna `address`)
- `src/hooks/useCustomers.ts`
- `src/components/crm/CustomerForm.tsx`
- `src/pages/Crm.tsx`
- `src/components/crm/CustomerDetailSheet.tsx`
- Novo: `src/components/crm/CustomerFichaCard.tsx`

