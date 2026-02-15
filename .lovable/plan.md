
# Redesign da Sidebar de Checkout do Cardapio

## Problemas atuais (vistos no screenshot)

- Espacamentos inconsistentes entre secoes
- Badges de secao ("ITENS DO CARRINHO", "DADOS DO PEDIDO") com estilo pesado e desalinhado
- Inputs sem padding interno consistente
- Total e botao ficam "soltos" no rodape sem separacao visual clara
- Falta de hierarquia visual entre secoes
- Itens do carrinho com layout apertado

## Melhorias propostas

### 1. Header refinado
- Icone do carrinho com fundo mais suave (gradiente sutil)
- Subtitulo com contagem de itens mais discreto
- Separador inferior com gradiente dourado (consistente com o resto do app)

### 2. Secao de itens do carrinho
- Substituir badge escuro por label leve com icone (texto dourado em vez de badge solido)
- Cards dos itens com padding uniforme (p-3.5), border mais sutil
- Foto do produto com cantos mais arredondados (rounded-xl)
- Controles de quantidade alinhados verticalmente ao centro
- Botao de remover item posicionado no canto superior direito do card

### 3. Secao de dados (Local / Delivery)
- Labels de secao com estilo leve: texto dourado com linha decorativa, sem badge solido
- Inputs com altura uniforme (h-11), border radius consistente (rounded-xl)
- Espacamento vertical entre campos padronizado (space-y-4)
- Labels com peso e tamanho consistente

### 4. Rodape (Total e CTA)
- Separador superior com gradiente dourado
- Linha do total com tipografia mais forte e alinhamento perfeito
- Subtotal por item visivel
- Botao "Finalizar Pedido" com gradiente dourado (consistente com o dialog de produto)
- "Limpar carrinho" com espacamento adequado

### 5. Espacamento global
- Padding lateral uniforme px-5 em todo o conteudo
- Gaps entre secoes padronizados em space-y-6
- Padding vertical do footer aumentado para py-5

## Detalhes tecnicos

### Arquivo alterado: `src/pages/Cardapio.tsx`

Reescrever o bloco do Sheet (linhas 549-748) com:

1. **Header**: manter estrutura, refinar cores e adicionar separador gradiente
2. **Section labels**: trocar de `<span className="inline-block bg-[#6B4513]...">` para um componente leve com borda inferior dourada e icone contextual
3. **Cart items**: uniformizar padding, alinhar controles, melhorar truncamento de texto
4. **Inputs**: classe unificada com `h-11 rounded-xl bg-gray-50/80 border-gray-200 focus:border-[#8B6914]/40 focus:ring-[#8B6914]/10`
5. **Footer**: gradiente no separador, tipografia reforçada no total, botao com gradiente
6. **ScrollArea**: ajustar padding interno para consistencia

### Layout visual proposto

```text
+----------------------------------+
|  [icon] Meu Carrinho             |
|         2 itens                  |
|  ─── gradiente dourado ───────── |
|                                  |
|  🛒 Itens do Carrinho            |
|  ┌──────────────────────────┐    |
|  │ [img] Nome Produto       │    |
|  │       R$ 115,00    - 1 + │    |
|  └──────────────────────────┘    |
|                                  |
|  📋 Dados do Pedido              |
|  ┌──────────────────────────┐    |
|  │ Numero da Comanda *      │    |
|  │ [____________]           │    |
|  │ Nome *                   │    |
|  │ [____________]           │    |
|  └──────────────────────────┘    |
|                                  |
|  ─── gradiente dourado ───────── |
|  Total          R$ 115,00        |
|  [===== Finalizar Pedido =====]  |
|       Limpar carrinho            |
+----------------------------------+
```

Mesma logica se aplica ao modo Delivery, com secao de endereco antes dos dados do cliente, ambas com o mesmo estilo de label leve.
