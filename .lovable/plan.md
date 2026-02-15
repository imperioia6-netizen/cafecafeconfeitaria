

# Reorganizar a Area de Criar Pedido

## Problema Atual

A area de criacao de pedido tem os campos de metadados (comanda, mesa, cliente, canal) soltos acima das abas, a barra flutuante do carrinho esta visualmente carregada com muitos elementos, e o fluxo geral carece de hierarquia clara e organizacao.

## Solucao

Reestruturar o fluxo em 3 zonas visuais bem definidas com hierarquia clara.

### Arquivo: `src/pages/Orders.tsx`

**1. Mover metadados do pedido para dentro do Cart Sheet**

Os campos Comanda, Mesa, Cliente e Canal saem do topo da pagina e vao para o Sheet do carrinho, aparecendo como uma secao "Dados do Pedido" entre os itens e o botao de confirmar. Isso limpa o topo e agrupa toda informacao do pedido em um unico lugar logico.

**2. Simplificar a barra flutuante do carrinho**

A barra flutuante fica mais compacta e limpa:
- Lado esquerdo: icone carrinho com badge de quantidade + valor total
- Lado direito: apenas botao "Ver Carrinho" (quando nao esta editando) ou "Adicionar ao Pedido #X" (quando editando)
- Remover o botao "Ver" separado (redundante)
- Botao de cancelar edicao fica dentro do Sheet, nao na barra

**3. Reorganizar o Cart Sheet com secoes claras**

O Sheet do carrinho fica dividido em secoes com separadores visuais:
- Secao 1: Lista de itens (com foto, nome, qty, preco, editar/remover)
- Secao 2: "Dados do Pedido" - campos Comanda, Mesa, Cliente, Canal em grid 2x2 compacto com icones
- Secao 3: Rodape fixo com total + botao "Criar Pedido" / "Adicionar ao Pedido"

**4. Header da pagina mais limpo**

- Titulo simplificado sem badge de pedidos abertos no topo (ja aparece na aba)
- Subtitulo contextual: "Monte o pedido do cliente" (normal) ou "Editando Pedido #X" (modo edicao) com destaque visual

### Detalhes Tecnicos

**Barra flutuante (linhas 678-735):**
- Remover botao "Ver" separado
- Ao clicar em qualquer parte da barra, abre o Sheet
- Botao principal unico: "Ver Carrinho" ou "Adicionar ao Pedido #X"
- Quando editando, mostrar badge visual "Editando #X" na barra

**Cart Sheet (linhas 844-941):**
- Adicionar secao de metadados (comanda, mesa, cliente, canal) com grid 2x2 abaixo dos itens
- Mover campos que estavam nas linhas 377-403 para dentro do Sheet
- Campos compactos com icones inline e labels menores
- Secao com titulo "Dados do Pedido" e separador visual

**Topo da pagina (linhas 362-403):**
- Remover o bloco glass-card com os 4 campos de metadados
- Manter apenas titulo + badge de pedidos abertos
- Quando editando, mostrar banner informativo com nome/numero do pedido sendo editado e botao de cancelar edicao

**Botao cancelar edicao:**
- Mover de dentro da barra flutuante para o Sheet do carrinho (no rodape, como link "Cancelar edicao")
- Tambem disponivel no banner de edicao no topo

