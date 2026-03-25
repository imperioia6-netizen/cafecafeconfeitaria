

# Plano: Organizar e limpar a lista de clientes do CRM

## Problema

A lista de clientes mostra dados sujos vindos do WhatsApp: nomes com emojis, tildes ("~Maria Aparecida~"), handles do Instagram ("@alineazedia"), numeros brutos sem formatacao ("58755823698068", "11984437405"), e entradas sem nome real.

## Solucao

### 1. Limpar nomes no `CustomerCard.tsx`

Criar funcao `cleanDisplayName(name)` que:
- Remove tildes e caracteres decorativos (`~`, `*`)
- Detecta se o nome e apenas um numero bruto e formata como telefone
- Mantém emojis (sao nomes reais do WhatsApp)
- Trim de espacos extras

Criar funcao `formatPhone(phone)` que formata numeros brasileiros:
- `11984437405` → `(11) 98443-7405`
- `5511984437405` → `+55 (11) 98443-7405`

### 2. Melhorar o `CustomerCard.tsx`

- Aplicar `cleanDisplayName` no nome exibido
- Aplicar `formatPhone` no telefone
- Melhorar layout com espacamento mais consistente
- Adicionar icone de WhatsApp se o cliente tem `remote_jid`

### 3. Melhorar iniciais no avatar

Atualizar `getInitials` para lidar com nomes que sao numeros (mostrar "#") ou emojis (mostrar o proprio emoji).

### 4. Ordenacao inteligente no `Crm.tsx`

Nomes que sao apenas numeros brutos ficam no final da lista quando ordenado por "Nome A-Z", priorizando clientes com nomes reais.

## Arquivos alterados

- `src/components/crm/CustomerCard.tsx` — limpeza de nome, formatacao de telefone, melhoria visual
- `src/pages/Crm.tsx` — ordenacao inteligente

