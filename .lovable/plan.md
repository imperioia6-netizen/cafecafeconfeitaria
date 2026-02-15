
# Melhorias nos Pedidos Abertos e Checkout do Cardapio

## Mudanca 1: Botao "Editar" nos Pedidos Abertos (Orders.tsx)

Na aba "Pedidos Abertos", cada card de pedido mostra apenas "Cancelar" e "Finalizar". Sera adicionado um botao "Editar" que abre o card em modo de edicao, permitindo:

- Adicionar novos itens ao pedido existente (abre um mini-seletor de produtos)
- O botao fica entre "Cancelar" e "Finalizar" na area de acoes

**Arquivo: `src/pages/Orders.tsx`**

- Adicionar um botao "Editar" com icone `Pencil` entre o botao Cancelar e Finalizar (linhas 601-618)
- Ao clicar, o comportamento sera: mudar para a aba "Cardapio" e carregar os dados do pedido no formulario de edicao (order_number, table_number, customer_name, channel) -- OU -- abrir um Sheet lateral com os itens do pedido para edicao rapida
- Abordagem escolhida: Ao clicar "Editar", o sistema vai para a aba Cardapio preenchendo os campos com os dados do pedido existente, permitindo adicionar itens via `useAddOrderItem`
- Novo state `editingOrder` para rastrear qual pedido esta sendo editado
- Quando `editingOrder` esta ativo, o botao "Criar Pedido" muda para "Adicionar ao Pedido"

**Detalhes tecnicos:**
- Novo state: `const [editingOrder, setEditingOrder] = useState<any>(null)`
- Botao Editar chama: `setEditingOrder(order); setActiveTab('cardapio')` e preenche os campos
- O floating cart bar mostra "Adicionar ao Pedido #X" quando editando
- Ao confirmar, usa `useAddOrderItem` para cada item novo, depois limpa o estado

## Mudanca 2: Opcao "Retirar no Local" no Checkout do Cardapio Digital (Cardapio.tsx)

No Sheet de checkout (carrinho lateral), quando o modo de entrega esta em "Delivery", adicionar um toggle/seletor dentro do proprio checkout para que o cliente possa escolher "Retirar no Local" sem precisar fechar o carrinho e voltar ao topo da pagina.

**Arquivo: `src/pages/Cardapio.tsx`**

- Dentro do Sheet de checkout (linha ~630, antes da secao de endereco), adicionar um seletor de modo de entrega com dois botoes: "Retirar no Local" e "Delivery"
- Visualmente: dois botoes arredondados lado a lado (mesmo estilo do toggle no topo da pagina) dentro de uma secao com titulo "Tipo de Entrega"
- Quando "Retirar no Local" e selecionado: esconde campos de endereco/telefone, mostra campos de comanda/nome
- Quando "Delivery" e selecionado: mostra campos de endereco/telefone/nome (comportamento atual)
- O toggle do topo da pagina continua funcionando e sincroniza com o do checkout

**Detalhes tecnicos:**
- Adicionar secao com icone `Store`/`Truck` e os dois botoes antes dos campos de dados (entre itens do carrinho e dados do pedido, ~linha 700)
- Reutiliza o state `deliveryMode` ja existente
- Os campos condicionais ja estao implementados (linhas 702-816), so precisa adicionar o toggle dentro do Sheet
