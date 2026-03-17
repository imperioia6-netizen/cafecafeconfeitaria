

# Plano: Trocar a chave OpenAI no banco

## Ação

Atualizar o valor de `agent_api_key` na tabela `crm_settings` com a nova chave fornecida (`sk-proj-WEdL...RPMA`).

## Detalhes Técnicos

- Executar um `UPDATE` na tabela `crm_settings` onde `key = 'agent_api_key'` com o novo valor.
- Nenhuma mudança de código necessária.

