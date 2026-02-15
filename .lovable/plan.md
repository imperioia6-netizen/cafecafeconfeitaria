

# Seletor Local / Delivery no Cardapio Digital

## O que muda

Atualmente o seletor "Retirada / Entrega" fica escondido dentro do Sheet de checkout. A proposta e trazer essa escolha para o topo da pagina, logo abaixo do banner, de forma bem visivel e intuitiva. Toda a experiencia se adapta conforme a escolha.

## Como funciona

### 1. Toggle no topo da pagina (abaixo do banner)

Um seletor estilizado com dois botoes lado a lado, fixo abaixo do banner:
- **No Local** (icone Store) -- selecionado por padrao
- **Delivery** (icone MapPin)

O seletor fica em uma faixa propria com fundo sutil, sempre visivel antes de comecar a navegar os produtos.

### 2. Adaptacoes visuais por modo

**Modo "No Local":**
- Header mostra "Cardapio" normalmente
- Barra flutuante do carrinho mostra "Fazer Pedido"
- No checkout: campos de endereco ficam ocultos
- Mensagem de sucesso: "Aguarde o preparo. Voce sera chamado quando estiver pronto."

**Modo "Delivery":**
- Header mostra um badge "Delivery" ao lado do titulo
- Barra flutuante mostra "Pedir Delivery"
- No checkout: campos de endereco aparecem automaticamente (ja existem)
- Validacao exige endereco e numero preenchidos
- Mensagem de sucesso: "Seu pedido sera entregue no endereco informado."

### 3. Remover seletor duplicado do checkout

Como o toggle agora fica na pagina principal, o seletor de "Como Receber" dentro do Sheet de checkout e removido. O modo ja esta definido antes de abrir o carrinho.

## Detalhes tecnicos

### Arquivo alterado: `src/pages/Cardapio.tsx`

1. **Mover o seletor de delivery para o topo**: criar uma secao entre o banner e as categorias com dois botoes estilizados (No Local / Delivery) usando o estado `deliveryMode` ja existente

2. **Estilo do seletor**: dois botoes com icones, fundo com gradiente sutil, o botao ativo ganha borda dourada e fundo destacado -- consistente com o design atual

3. **Adaptar textos dinamicamente**:
   - Barra flutuante: texto do botao muda conforme o modo
   - Tela de sucesso: mensagem muda conforme o modo
   - Header: badge opcional no modo delivery

4. **Checkout Sheet**: remover o bloco do RadioGroup de "Como Receber" e manter os campos de endereco condicionais ao `deliveryMode === 'delivery'` diretamente

5. **Nenhuma mudanca no backend**: o `delivery_mode` ja e enviado na chamada da Edge Function

### Layout do seletor

```text
+--------------------------------------------------+
|   [Store] No Local    |    [MapPin] Delivery      |
+--------------------------------------------------+
```

Posicionado logo abaixo do banner, antes da secao "Nossos Produtos".

