

# Botao WhatsApp com QR Code e Preparacao para API

Ao clicar no botao WhatsApp na aba Clientes, abrir um Dialog/Modal com QR Code placeholder e instrucoes para conectar a API do WhatsApp Business.

---

## O que sera feito

### 1. Criar componente `WhatsAppConnectDialog`

Novo arquivo: `src/components/crm/WhatsAppConnectDialog.tsx`

- Dialog modal elegante com visual cinematic (glass-card, gradientes escuros)
- Exibe uma area de QR Code (placeholder com borda tracejada e icone de QR)
- Campo de input para o usuario colar a URL/token da API do WhatsApp (ex: webhook URL ou API key)
- Botao "Conectar" que salva a configuracao (inicialmente no estado local, preparado para futura integracao com Supabase)
- Status de conexao: "Desconectado" (vermelho) / "Conectado" (verde)
- Instrucoes breves sobre como obter acesso a API do WhatsApp Business

### 2. Atualizar `Crm.tsx`

- O botao WhatsApp existente passa a abrir o `WhatsAppConnectDialog` ao inves de `window.open`
- Import do novo componente

### 3. Estrutura do Dialog

```text
+---------------------------------------+
|        Conectar WhatsApp               |
+---------------------------------------+
|                                        |
|    +---------------------------+       |
|    |                           |       |
|    |     [QR Code Area]        |       |
|    |     Escaneie com seu      |       |
|    |     WhatsApp Business     |       |
|    |                           |       |
|    +---------------------------+       |
|                                        |
|    Status: ● Desconectado              |
|                                        |
|    API Webhook URL                     |
|    [________________________]          |
|                                        |
|    API Token                           |
|    [________________________]          |
|                                        |
|    [ Conectar ]  [ Cancelar ]          |
+---------------------------------------+
```

## Detalhes Tecnicos

- O QR Code sera um placeholder visual (div com icone `QrCode` do lucide-react e borda tracejada) — pronto para receber um QR real quando a API for integrada
- Campos `webhookUrl` e `apiToken` controlados por estado local
- Botao "Conectar" mostra toast de sucesso e muda status para "Conectado"
- Preparado para futura integracao: os campos ja estarao estruturados para enviar a uma edge function ou salvar em `crm_settings`
- Usa componentes existentes: `Dialog`, `Input`, `Button`, `Badge` do shadcn/ui

### Arquivos

| Acao   | Arquivo                                      |
|--------|----------------------------------------------|
| Criar  | `src/components/crm/WhatsAppConnectDialog.tsx` |
| Editar | `src/pages/Crm.tsx`                           |

