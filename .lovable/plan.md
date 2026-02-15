

# Mover "Pedidos" para a secao "Gestao" no menu lateral

## O que muda

O item "Pedidos" atualmente esta na secao **Operacao** do sidebar. Sera movido para a secao **Gestao**, logo apos "CRM".

## Detalhe tecnico

### Arquivo: `src/components/layout/AppSidebar.tsx`

Remover a linha `{ label: 'Pedidos', icon: ClipboardList, path: '/orders', ownerOnly: false }` do grupo "Operacao" e adiciona-la ao final do grupo "Gestao":

```
Gestao:
  - Dashboard
  - Produtos
  - Relatorios
  - CRM
  - Pedidos   <-- nova posicao
```

Apenas uma linha movida de lugar, sem alteracao de icone, path ou permissao.

