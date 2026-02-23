
# Corrigir Tela Branca nas Abas do CRM

## Problema Identificado
As abas Pipeline, Aniversarios, Reativacao e Config podem causar tela branca por dois motivos:

1. **N8nSettingsPanel (Config)**: Chama `setState` diretamente no corpo do render (linhas 25-30), o que e um anti-pattern do React que pode causar loops de re-render
2. **Falta de tratamento de erro**: Nenhum dos componentes das abas tem tratamento de erros (error boundary ou try/catch no render). Se qualquer query do Supabase falhar, o componente crasha e a tela fica branca
3. **Imports nao utilizados**: `Instagram` importado em `CustomerCard.tsx` e `CustomerDetailSheet.tsx` sem uso

## Solucao

### 1. Corrigir N8nSettingsPanel - setState no render
Substituir a logica de `if (settings && !loaded) { setState... }` por um `useEffect`, que e o padrao correto do React para sincronizar estado com dados externos.

### 2. Adicionar tratamento de erro em cada aba
Envolver cada `TabsContent` com tratamento seguro:
- Verificar `isError` dos hooks de query antes de renderizar
- Mostrar mensagem de fallback amigavel em caso de erro
- Usar optional chaining (`?.`) em todos os acessos a dados

### 3. Limpar imports nao utilizados
Remover `Instagram` dos imports de `CustomerCard.tsx` e `CustomerDetailSheet.tsx`.

## Arquivos Modificados

### `src/components/crm/N8nSettingsPanel.tsx`
- Substituir bloco de setState no render body por `useEffect`
- Importar `useEffect` do React

### `src/components/crm/CustomerCard.tsx`
- Remover `Instagram` do import

### `src/components/crm/CustomerDetailSheet.tsx`
- Remover `Instagram` do import

### `src/pages/Crm.tsx`
- Envolver componentes das abas com verificacao de erro
- Adicionar fallback visual para erros de carregamento
