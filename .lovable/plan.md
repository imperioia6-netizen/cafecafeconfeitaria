

# Melhoria dos Campos do Pipeline de Leads

Upgrade do formulario e dos cards do Kanban para tornar a experiencia mais profissional, com novos campos, melhor organizacao visual e funcionalidades extras.

---

## Novos Campos no Formulario de Lead

Adicionar campos que trazem mais contexto e controle sobre cada lead:

- **Email** — campo de contato adicional
- **Origem/Fonte** — de onde veio o lead (Instagram, Indicacao, WhatsApp, Site, Outro) via Select dropdown
- **Prioridade** — Alta, Media, Baixa com badges coloridas (vermelho, amarelo, verde)
- **Data de Follow-up** — quando fazer o proximo contato (date picker)
- **Produto de Interesse** — texto livre para registrar o que o lead quer

## Alteracoes no Banco de Dados

Migration para adicionar novas colunas na tabela `social_leads`:
```text
ALTER TABLE social_leads
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS product_interest text;
```

## Melhorias nos Cards do Kanban

Cada card passara a mostrar:
- **Badge de prioridade** colorida (Alta = vermelho, Media = amarelo, Baixa = verde) no canto superior
- **Origem** com icone correspondente (Instagram, WhatsApp, etc.)
- **Indicador de follow-up** — se a data ja passou, mostrar em vermelho "Atrasado"; se e hoje, "Hoje"; se e futura, mostrar a data
- **Produto de interesse** como tag discreta
- **Avatar com iniciais** do nome no lugar do texto puro

## Melhorias no Dialog de Criacao/Edicao

- Reorganizar em 2 colunas (nome + email na primeira linha, telefone + instagram na segunda)
- Selects estilizados para Origem e Prioridade
- Date picker para Follow-up usando o calendario existente
- Separador visual entre "Dados de Contato" e "Detalhes do Negocio"
- Botao de deletar no dialog de edicao (com confirmacao)

## Detalhes Tecnicos

### Arquivos Modificados
- `supabase/migrations/` — nova migration com ALTER TABLE
- `src/integrations/supabase/types.ts` — atualizar tipos
- `src/hooks/useSocialLeads.ts` — adicionar novos campos na interface e mutations
- `src/components/crm/LeadsKanban.tsx` — formulario expandido, cards melhorados, layout 2 colunas no dialog

### Sequencia
1. Migration SQL
2. Atualizar tipos e hook
3. Redesign do dialog com novos campos
4. Upgrade visual dos cards do Kanban

