
# Pedidos Abertos em Secao Separada (Tabs)

## O que muda

Atualmente os "Pedidos Abertos" aparecem abaixo do grid de produtos, obrigando o usuario a rolar para baixo para ve-los. A proposta e reorganizar a pagina com um sistema de **abas (Tabs)** no topo, separando o conteudo em duas visoes claras:

- **Aba "Cardapio"**: contem o catalogo de produtos, busca, categorias e barra flutuante do carrinho (tudo que ja existe)
- **Aba "Pedidos Abertos"**: exibe exclusivamente os cards de pedidos em aberto com acoes de finalizar/cancelar

O header (titulo, metadata de comanda/mesa/cliente/canal) permanece **acima das abas**, pois sao dados compartilhados por ambas as visoes.

## Layout proposto

```text
+------------------------------------------+
| Cardapio                                 |
| Monte o pedido do cliente                |
+------------------------------------------+
| # Comanda | Mesa | Cliente | Canal       |
+------------------------------------------+
| [Cardapio]  [Pedidos Abertos (3)]        |  <- Tabs
+------------------------------------------+
|                                          |
|  (conteudo da aba ativa)                 |
|                                          |
+------------------------------------------+
```

## Detalhes tecnicos

### Arquivo: `src/pages/Orders.tsx`

1. **Importar Tabs** de `@/components/ui/tabs` (`Tabs, TabsList, TabsTrigger, TabsContent`)

2. **Adicionar estado de aba ativa**: usar o componente Tabs com `defaultValue="cardapio"`
   - Quando o pedido e criado com sucesso, trocar automaticamente para a aba "pedidos" para o usuario ver o pedido recem-criado

3. **Reestruturar o JSX**:
   - Manter header + metadata bar fora das tabs (acima)
   - Envolver busca + categorias + grid de produtos em `TabsContent value="cardapio"`
   - Mover a secao "Pedidos Abertos" inteira para `TabsContent value="pedidos"`
   - A barra flutuante do carrinho permanece fora das tabs (fixed, visivel em ambas as abas)

4. **TabsList estilizada**:
   - Aba "Cardapio" com icone de `ShoppingBag`
   - Aba "Pedidos Abertos" com icone de `ClipboardList` e badge mostrando a quantidade de pedidos abertos
   - Estilo consistente com o design system (rounded-xl, cores de accent)

5. **Auto-switch**: apos `handleCreateOrder` com sucesso, chamar a funcao para mudar a aba ativa para "pedidos" (usando estado controlado com `value` e `onValueChange`)

### Arquivo unico alterado:
- `src/pages/Orders.tsx`
