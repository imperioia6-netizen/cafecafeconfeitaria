

# Plano: Bot só responde mensagens da instância configurada

## Problema
O webhook recebe mensagens de qualquer instância Evolution que aponte para a URL. Quando o usuário trocou o número de atendimento, a instância antiga continuou enviando webhooks e o bot respondeu por ela. Não há validação de qual instância/número enviou o webhook.

## Solução
A Evolution API envia no payload um campo `instance` (ou `instanceName`) identificando qual instância disparou o webhook. Vamos comparar esse campo com o `evolution_instance` configurado em `crm_settings`. Se não bater, ignoramos a mensagem.

## Mudança

### `supabase/functions/evolution-webhook/index.ts`
Após extrair `evo` das settings (linha ~828), extrair o nome da instância do payload (`payload.instance`, `payload.instanceName`, ou `payload.server_url`) e comparar com `evo.instance`. Se o nome da instância estiver configurado e o payload vier de outra instância, retornar `{ ok: true, ignored: "wrong_instance" }` sem processar.

Lógica:
```
const payloadInstance = payload.instance || payload.instanceName || "";
if (evo.instance && evo.instance !== "default" && payloadInstance && payloadInstance !== evo.instance) {
  return ignore("wrong_instance");
}
```

Isso garante que o bot só processa mensagens da instância configurada, ignorando webhooks de instâncias antigas ou de teste.

| Arquivo | Mudança |
|---|---|
| `supabase/functions/evolution-webhook/index.ts` | Validar instância do payload contra a configurada |

