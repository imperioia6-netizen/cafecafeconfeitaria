
# Reposicionar o Botao "Visao: Cliente"

## Problema
O badge "Visao: Cliente" esta posicionado em `fixed top-3 right-3` com `z-[60]`, sobrepondo os icones de carrinho e perfil no header fixo.

## Solucao
Mover o badge para o **topo da pagina**, acima do header fixo, como uma barra fina de aviso. Assim nao conflita com nenhum elemento interativo.

### Alteracoes em `src/pages/Cardapio.tsx`

1. **Remover o badge flutuante** (linhas 166-177) da posicao `fixed top-3 right-3`
2. **Criar uma barra fixa no topo** (`fixed top-0`) com `z-[60]`, fundo `bg-warning`, altura compacta (~32px), largura total, com o texto "Visao: Cliente" centralizado e o botao X a direita
3. **Ajustar o header** de `top-0` para `top-8` (abaixo da barra de simulacao quando ativa)
4. **Ajustar o padding-top** do container principal de `pt-[73px]` para `pt-[105px]` quando simulando, e manter `pt-[73px]` quando nao

### Resultado visual:

```text
[===== Visao: Cliente  [X] ======]  <- barra fina fixa no topo
[== HEADER (busca + carrinho) ===]  <- header logo abaixo
[== CATEGORIAS ==================]
```

### Arquivo alterado:
- `src/pages/Cardapio.tsx`
