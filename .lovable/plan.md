

# Varredura Completa de Bugs de Renderizacao no CRM

## Problemas Identificados

Apos revisar todos os arquivos das abas do CRM, identifiquei os seguintes problemas que podem causar tela branca ou erros de render:

### 1. `showAddForm` nunca renderiza nada (Crm.tsx)
O estado `showAddForm` e setado para `true` ao clicar em "Novo Cliente", mas **nenhum componente usa esse estado para renderizar um dialog/formulario**. O `CustomerForm` e importado mas nunca recebe `showAddForm` como prop. Isso nao causa tela branca, mas o botao nao faz nada.

### 2. Queries sem tratamento de erro nas abas (causa principal da tela branca)
Todos os componentes das abas (`LeadsKanban`, `BirthdayTimeline`, `ReactivationPanel`, `N8nSettingsPanel`) fazem queries ao Supabase sem nenhum tratamento de `isError`. Se a RLS bloquear o acesso ou a query falhar, o componente tenta renderizar dados `undefined` e crasha.

Exemplo critico: `crm_settings` so permite SELECT para `is_owner()`. Se o usuario nao for reconhecido como owner momentaneamente (race condition no auth), a query falha e o componente Config crasha.

### 3. `parseISO` sem protecao em `BirthdayTimeline` e `ReactivationPanel`
Chamadas como `parseISO(c.last_purchase_at!)` com `!` (non-null assertion) podem explodir se o dado vier null/undefined do banco.

## Solucao

### Arquivo: `src/pages/Crm.tsx`
- Renderizar `CustomerForm` como dialog controlado por `showAddForm`
- Adicionar `onOpenChange` para fechar o dialog apos sucesso

### Arquivo: `src/components/crm/LeadsKanban.tsx`
- Adicionar verificacao `isError` do hook `useSocialLeads` com fallback visual

### Arquivo: `src/components/crm/BirthdayTimeline.tsx`
- Adicionar verificacao `isError` dos hooks `useCustomers` e `useCrmMessages`
- Proteger `parseISO` com optional chaining

### Arquivo: `src/components/crm/ReactivationPanel.tsx`
- Adicionar verificacao `isError` do hook `useCustomers`
- Proteger `parseISO` com verificacao de null

### Arquivo: `src/components/crm/N8nSettingsPanel.tsx`
- Adicionar verificacao `isError` dos hooks `useCrmSettings` e `useCrmMessages`
- Mostrar fallback amigavel com mensagem de erro

### Arquivo: `src/components/crm/CrmDashboardKpis.tsx`
- Adicionar verificacao `isError` do hook `useCustomers`

### Padrao de fallback para todas as abas
Cada componente que faz query recebera este bloco no inicio do render:

```text
if (isError) {
  return (
    <div className="text-center py-12">
      <AlertTriangle icon />
      <p>Erro ao carregar dados</p>
      <p>Tente recarregar a pagina</p>
    </div>
  );
}
```

Isso garante que nenhuma aba cause tela branca, mesmo se a query falhar.

## Resumo de arquivos modificados
- `src/pages/Crm.tsx` — conectar `showAddForm` ao `CustomerForm` dialog
- `src/components/crm/LeadsKanban.tsx` — fallback de erro
- `src/components/crm/BirthdayTimeline.tsx` — fallback de erro + protecao parseISO
- `src/components/crm/ReactivationPanel.tsx` — fallback de erro + protecao parseISO
- `src/components/crm/N8nSettingsPanel.tsx` — fallback de erro
- `src/components/crm/CrmDashboardKpis.tsx` — fallback de erro

