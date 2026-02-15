

# Substituir Estoque por CRM na Navbar Mobile

## Alteracao

No arquivo `src/components/layout/MobileBottomNav.tsx`, trocar o item "Estoque" pelo "CRM" nas rotas do owner (administrador).

### Detalhes

- **Remover**: `{ path: '/inventory', label: 'Estoque', icon: Package }`
- **Adicionar**: `{ path: '/crm', label: 'CRM', icon: Heart }`
- Importar o icone `Heart` do lucide-react (ja importado no AppSidebar, consistente com o resto do app)
- A navbar do employee permanece inalterada (continua com Estoque, pois funcionarios nao acessam CRM)

### Arquivo: `src/components/layout/MobileBottomNav.tsx`

**ownerNav** passa a ser:
```
Dashboard | Pedidos | Vendas | CRM
```

**employeeNav** permanece:
```
Producao | Pedidos | Vendas | Estoque
```

