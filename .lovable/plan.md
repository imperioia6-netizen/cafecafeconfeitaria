
# Adaptar checkout do Cardapio por modo (Local vs Delivery)

## O que muda

Atualmente o checkout pede sempre os mesmos campos (nome e telefone) independente do modo. A proposta e adaptar os campos exibidos conforme o modo selecionado:

**Modo "No Local":**
- Pedir **numero da comanda** (obrigatorio)
- Pedir **nome do cliente** (obrigatorio)
- Telefone fica oculto (desnecessario para consumo no local)

**Modo "Delivery":**
- Pedir **nome do cliente** (obrigatorio)
- Pedir **telefone** (obrigatorio -- necessario para contato de entrega)
- Pedir **endereco** (obrigatorio)
- Pedir **numero** (obrigatorio)
- Pedir **complemento** (opcional)

## Detalhes tecnicos

### Arquivo alterado: `src/pages/Cardapio.tsx`

1. **Novo estado**: adicionar `orderNumber` (string) para armazenar o numero da comanda no modo local

2. **Secao "Dados do Cliente" condicional**:
   - No modo **pickup**: mostrar campos "Numero da Comanda" e "Nome" (telefone oculto)
   - No modo **delivery**: mostrar campos "Nome", "Telefone" (obrigatorio, nao opcional), e os campos de endereco que ja existem

3. **Validacao do botao "Finalizar Pedido"**: atualizar a condicao de `disabled` para:
   - Pickup: exigir `customerName` e `orderNumber`
   - Delivery: exigir `customerName`, `customerPhone`, `address` e `addressNumber`

4. **Enviar `order_number` no pedido**: passar o campo `order_number` no body da chamada a Edge Function `public-order` quando for modo local

5. **Reset do formulario**: incluir `orderNumber` no `handleNewOrder`

6. **Labels e placeholders adaptados**: "Numero da Comanda" com placeholder "Ex: 42" no modo local; telefone muda de "(opcional)" para obrigatorio no modo delivery

### Reorganizacao visual do checkout

```text
MODO LOCAL:
+----------------------------------+
|  ITENS DO CARRINHO               |
|  [lista de itens]                |
|                                  |
|  DADOS DO PEDIDO                 |
|  Numero da Comanda *  [___]      |
|  Nome *               [___]      |
|                                  |
|  [Finalizar Pedido]              |
+----------------------------------+

MODO DELIVERY:
+----------------------------------+
|  ITENS DO CARRINHO               |
|  [lista de itens]                |
|                                  |
|  ENDERECO DE ENTREGA             |
|  Endereco *           [___]      |
|  Numero *  | Complemento [___]   |
|                                  |
|  DADOS DO CLIENTE                |
|  Nome *               [___]      |
|  Telefone *           [___]      |
|                                  |
|  [Finalizar Pedido]              |
+----------------------------------+
```

### Edge Function `public-order`

Verificar se ja aceita `order_number` no body (provavelmente sim, pois ja insere na tabela `orders`). Caso contrario, adicionar suporte.
