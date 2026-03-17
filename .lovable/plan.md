

# Plano: Salvar nova chave OpenAI e garantir que o CRM config funciona

## Diagnóstico

A interface de configuração no CRM (aba Automação) **já existe e funciona** — tem campos para API Key, URL base e Modelo. O problema é que a chave salva anteriormente (`sk-svcacct-...`) provavelmente expirou ou é inválida, fazendo o sistema cair no fallback do Lovable AI (Google Gemini Flash).

Já existe uma chave no banco (`agent_api_key = sk-svcacct-...`), mas está desatualizada.

## Ações

### 1. Atualizar a chave no banco de dados
Usar o Supabase para atualizar o valor de `agent_api_key` na tabela `crm_settings` com a nova chave que você passou (`sk-proj...`), e mudar o modelo para `gpt-4o` (atualmente está `gpt-4o-mini`).

### 2. Fazer deploy da edge function `evolution-webhook`
Para garantir que o código com `temperature: 0` e todas as regras de prompt estejam rodando em produção.

### Resultado
- O agente WhatsApp passa a usar GPT-4o da OpenAI em vez do Gemini Flash
- Você pode alterar a chave a qualquer momento pela aba **Automação** no CRM (campo "API Key OpenAI / ChatGPT")
- Não precisa de nenhuma mudança no código — tudo já está implementado

