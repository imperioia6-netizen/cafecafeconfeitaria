

# Plano: Filtrar conversas pelo numero conectado na Evolution

## Problema

A aba "Conversas" mostra todos os clientes com mensagens WhatsApp dos ultimos 7 dias, incluindo numeros antigos ou de instancias anteriores. O usuario quer ver apenas conversas ativas vinculadas ao numero atualmente conectado na instancia Evolution configurada.

## Solucao

### 1. Editar `src/hooks/useLiveChats.ts`

Modificar a query de conversas para:

1. **Buscar a `evolution_instance` e `evolution_base_url` e `evolution_api_key` de `crm_settings`** antes de montar a lista
2. **Se nao houver instancia configurada**, retornar lista vazia (nada conectado = nada aparece)
3. **Filtrar apenas clientes que possuem `remote_jid` preenchido** (somente quem realmente conversou via WhatsApp)
4. **Remover `refetchInterval` e usar apenas Realtime** para atualizacao, combinado com `staleTime: 0` para garantir dados frescos no F5

Logica revisada:
```
- Busca crm_settings para verificar se evolution_instance esta configurada
- Se vazio → retorna []
- Busca crm_messages dos ultimos 7 dias (whatsapp_entrada/saida)
- Busca customers com remote_jid NOT NULL (filtra quem tem WhatsApp real)
- Cruza: so mostra clientes que tem remote_jid E mensagens recentes
```

### 2. Garantir refresh no F5

- Adicionar `staleTime: 0` e `gcTime: 0` na query para que ao recarregar a pagina sempre busque dados frescos
- Manter Realtime subscription para updates em tempo real

### 3. Editar `src/components/crm/LiveChatsPanel.tsx`

- Mostrar mensagem "Nenhuma instancia conectada" quando nao ha `evolution_instance` configurada, em vez de "Nenhuma conversa ainda"

## Arquivos alterados

- `src/hooks/useLiveChats.ts` — filtro por instancia conectada, staleTime 0
- `src/components/crm/LiveChatsPanel.tsx` — mensagem quando sem instancia

