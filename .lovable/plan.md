

# Visao Cliente: Redirecionar para o Cardapio Digital

## Problema

Quando o proprietario ativa "Visao: Cliente" no header, o sistema continua mostrando a interface completa de gestao (sidebar, header, pedidos). O cliente nao deveria ver nenhuma dessas opcoes -- apenas o cardapio digital estilo iFood.

## Solucao

Quando `viewAs === 'client'`, o `AppLayout` redirecionara automaticamente para `/cardapio`, e a pagina do Cardapio exibira um botao discreto para o owner voltar a visao normal.

## Alteracoes

### 1. `src/components/layout/AppLayout.tsx`
- Adicionar verificacao: se `viewAs === 'client'`, fazer `<Navigate to="/cardapio" replace />` em vez de renderizar o layout de gestao

### 2. `src/pages/Cardapio.tsx`
- Importar `useAuth` e verificar se o usuario esta logado com `viewAs === 'client'`
- Se sim, exibir um badge flutuante no topo direito (similar ao que ja existe no header): "Visao: Cliente X" que ao clicar remove o `viewAs` e redireciona de volta para `/`
- Isso permite ao owner sair da simulacao facilmente

## Fluxo

```text
Owner clica "Trocar Visao > Cliente"
        |
        v
viewAs = 'client' → AppLayout redireciona para /cardapio
        |
        v
Cardapio exibe experiencia limpa + badge "Visao: Cliente ✕"
        |
        v
Owner clica no badge → viewAs = null → volta para /
```

## Detalhes Tecnicos

- O `useAuth` ja esta disponivel globalmente via `AuthProvider` que envolve todas as rotas
- A pagina `/cardapio` ja funciona sem autenticacao, entao nao ha conflito
- O badge de simulacao so aparece se o usuario estiver logado E com `viewAs === 'client'`
- Nenhuma alteracao no banco de dados necessaria

