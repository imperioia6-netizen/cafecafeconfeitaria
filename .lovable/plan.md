

# Mover Inteligencia para dentro da Producao

## Resumo

Integrar as abas de "Inteligencia" (Promocoes 12h+ e Relatorios IA) como uma nova aba dentro da pagina de Producao, eliminando a rota `/smart` separada e o item do menu lateral.

## Alteracoes

### 1. Pagina de Producao (`src/pages/Production.tsx`)

Transformar a pagina em um layout com abas (Tabs):

- **Aba "Producao"**: conteudo atual da pagina (formulario + ficha de producao)
- **Aba "Promocoes 12h+"**: componente `AutoPromotionsPanel` (ja existe)
- **Aba "Relatorios IA"**: componente `AiReportsPanel` (ja existe)

As abas usarao o mesmo estilo visual dos tabs do SmartHub (pills com gradiente dourado).

```text
Producao
Registrar producao do dia

[Producao]  [Promocoes 12h+]  [Relatorios IA]

(conteudo da aba selecionada)
```

### 2. Menu lateral (`src/components/layout/AppSidebar.tsx`)

Remover o item "Inteligencia" (`{ label: 'Inteligencia', icon: Brain, path: '/smart', ownerOnly: true }`) do grupo "Gestao".

### 3. Rotas (`src/App.tsx`)

- Remover a rota `/smart` e o import de `SmartHub`
- O arquivo `src/pages/SmartHub.tsx` pode ser mantido ou removido (nao causa impacto)

### 4. Visibilidade das abas de IA

As abas "Promocoes 12h+" e "Relatorios IA" serao visiveis apenas para owners (`isOwner`), mantendo a mesma restricao de acesso que o SmartHub tinha. Funcionarios verao apenas a aba de Producao sem as tabs extras.

### 5. Detalhes tecnicos

- Importar `Tabs, TabsContent, TabsList, TabsTrigger` na pagina de Producao
- Importar `AutoPromotionsPanel` e `AiReportsPanel`
- Importar `Zap` e `Brain` do lucide-react para os icones das tabs
- Usar `isOwner` do `useAuth()` (ja disponivel) para condicionar a exibicao
- Estado local `activeTab` com valor padrao `'production'`

