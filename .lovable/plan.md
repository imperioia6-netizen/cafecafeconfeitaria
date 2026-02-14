

# Simplificar Configuracao de Atendimento

Reduzir o card "Atendimento" para ter apenas uma unica configuracao: retorno automatico apos periodo sem resposta do cliente.

---

## Alteracoes

### Arquivo: `src/components/crm/N8nSettingsPanel.tsx`

**Remover:**
- O toggle "Atendimento automatico" (distribuir novos clientes) e seu estado `autoAssign`
- A referencia a `auto_assign_enabled` no carregamento e no salvamento

**Manter/Ajustar:**
- Um toggle (Switch) para ativar/desativar o recurso de "voltar contato" automaticamente
- Campo numerico para definir os minutos sem resposta
- O campo de minutos so fica habilitado quando o toggle esta ativo
- Botao "Salvar" persiste ambos: `auto_return_enabled` (true/false) e `no_response_minutes`

### Resultado visual
O card tera:
1. Titulo "Atendimento" com icone e descricao
2. Uma linha com label "Retorno automatico" + Switch para ativar/desativar
3. Campo numerico de minutos (visivel/habilitado somente quando ativo)
4. Botao Salvar

