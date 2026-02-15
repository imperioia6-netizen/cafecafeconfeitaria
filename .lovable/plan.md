

# Ajustar Dimensoes da Barra Flutuante do Carrinho no Mobile

## Problema

A barra flutuante do carrinho na pagina de pedidos esta com elementos apertados no mobile -- o icone do carrinho, valor, botao "Ver" e "Criar Pedido" ficam comprimidos sem respiro adequado.

## Solucao

Ajustar o padding, tamanhos e espacamento dos elementos internos da barra no mobile para ficar mais organizado e legivel, como na imagem de referencia.

## Detalhes Tecnicos

### Arquivo: `src/pages/Orders.tsx` (linhas 632-676)

**Alteracoes:**

1. **Container externo (linha 632):** Reduzir margem lateral no mobile
   - De: `w-[calc(100%-2rem)]`
   - Para: `w-[calc(100%-1.5rem)]` -- um pouco mais largo no mobile

2. **Container interno (linha 634):** Ajustar padding no mobile
   - De: `px-5 py-3.5`
   - Para: `px-3 py-3 md:px-5 md:py-3.5` -- menos padding horizontal no mobile para dar mais espaco ao conteudo

3. **Icone do carrinho (linha 642):** Reduzir tamanho no mobile
   - De: `h-10 w-10`
   - Para: `h-9 w-9` -- ligeiramente menor

4. **Texto do valor (linha 652):** Manter fonte bold mas ajustar tamanho
   - De: `font-bold font-mono-numbers`
   - Para: `font-bold font-mono-numbers text-sm md:text-base` -- menor no mobile

5. **Botao "Criar Pedido" (linha 666):** Reduzir padding horizontal no mobile
   - De: `px-5`
   - Para: `px-3 md:px-5` -- mais compacto no mobile

Essas mudancas dao mais respiro aos elementos e mantem a barra proporcional a tela no mobile sem cortar textos ou empilhar botoes.

