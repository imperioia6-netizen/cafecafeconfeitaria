

# Adicionar Configuracoes de Atendimento no CRM

Adicionar uma nova secao de configuracoes de atendimento na aba Config do CRM, inspirada no design da imagem de referencia.

---

## O que sera adicionado

### Nova secao: "Atendimento"
Subtitulo: "Configure o comportamento do sistema de atendimento"

Duas configuracoes:

1. **Atendimento automatico** — Toggle (Switch) para ativar/desativar distribuicao automatica de novos clientes para atendentes disponiveis
   - Chave: `auto_assign_enabled` (valor: `"true"` / `"false"`)

2. **Minutos sem resposta para voltar contato** — Campo numerico
   - Descricao: "Apos este tempo sem resposta do cliente, o status sera alterado para 'Voltar contato'"
   - Chave: `no_response_minutes` (valor padrao: `"30"`)

---

## Detalhes Tecnicos

### Arquivo modificado
- `src/components/crm/N8nSettingsPanel.tsx`

### Alteracoes

1. Importar `Switch` de `@/components/ui/switch`
2. Adicionar estados locais: `autoAssign` (boolean) e `noResponseMinutes` (string)
3. Carregar valores do `getSetting` no bloco `if (settings && !loaded)`
4. Adicionar novo `Card` no topo do painel (antes do Webhook) com:
   - Icone `Headset` do lucide-react
   - Titulo "Atendimento"
   - Descricao sutil abaixo do titulo
   - Linha com label + Switch para atendimento automatico
   - Campo numerico para minutos sem resposta
   - Botao "Salvar" que persiste ambos os valores via `upsertSetting`

### Nenhuma mudanca no banco de dados
A tabela `crm_settings` ja suporta chave/valor generico, entao as novas configuracoes serao armazenadas como novos registros sem necessidade de migration.

