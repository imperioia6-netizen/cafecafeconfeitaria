

# Mover Alertas para dentro do Estoque

## Resumo

Integrar a pagina de Alertas como uma aba dentro da pagina de Estoque, seguindo o mesmo padrao usado na Producao (tabs). Remover o item "Alertas" do menu lateral e a rota separada.

## Alteracoes

### 1. Pagina de Estoque (`src/pages/Inventory.tsx`)

Adicionar layout com abas (Tabs):

- **Aba "Estoque"**: conteudo atual (cards de inventario com filtros)
- **Aba "Alertas"**: conteudo da pagina de Alertas (timeline de alertas com resolucao)

```text
Estoque
Controle em tempo real

[Estoque]  [Alertas (3)]

(conteudo da aba selecionada)
```

O badge com contagem de alertas ativos aparecera ao lado do titulo da aba "Alertas" para visibilidade imediata.

### 2. Menu lateral (`src/components/layout/AppSidebar.tsx`)

Remover o item `{ label: 'Alertas', icon: AlertTriangle, path: '/alerts', ownerOnly: true }` do grupo "Gestao".

### 3. Rotas (`src/App.tsx`)

Remover a rota `/alerts` e o import de `Alerts`.

### 4. Detalhes tecnicos

- Extrair o conteudo da pagina de Alertas (`src/pages/Alerts.tsx`) para um componente reutilizavel `AlertsContent` dentro do proprio arquivo ou inline na pagina de Estoque
- Importar `Tabs, TabsContent, TabsList, TabsTrigger` do shadcn
- Importar `useActiveAlerts, useResolveAlert, useAlertCount` dos hooks existentes
- Importar icones necessarios: `AlertTriangle, CheckCircle, Package, Clock, Trash2, HelpCircle`
- A aba de Alertas sera visivel para todos os usuarios (nao requer `isOwner`), ja que alertas de estoque sao relevantes para a operacao
- Estado local `activeTab` com valor padrao `'inventory'`

