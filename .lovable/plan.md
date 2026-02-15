

# Redesign da Navbar Mobile -- Mais Refinada e Premium

## Objetivo

Elevar a qualidade visual da barra de navegacao inferior mobile, tornando-a mais sofisticada, com melhor hierarquia visual entre itens ativos/inativos e um visual mais polido e "app-like".

## Melhorias Visuais

### 1. Fundo com mais profundidade
- Adicionar uma borda superior com gradiente dourado sutil ao inves de borda solida
- Aplicar sombra superior para criar sensacao de elevacao ("flutuando" sobre o conteudo)

### 2. Indicador ativo reimaginado
- Substituir a pill horizontal por um fundo com glow dourado suave ao redor do icone ativo
- Icone ativo maior com leve brilho (drop-shadow dourado)
- Label ativo com peso e cor mais destacados

### 3. Icones inativos mais elegantes
- Opacidade ligeiramente maior para melhor visibilidade
- Cor neutra mais quente para manter coesao com o tema

### 4. Espacamento e proporcoes
- Aumentar levemente a altura da barra (de 68px para 72px) para mais "respiro"
- Gap entre icone e label mais consistente
- Icone container com bordas mais suaves

### 5. Efeito de toque
- Manter `active:scale-90` mas adicionar transicao haptica visual (leve pulse no glow ao tocar item ativo)

## Detalhe Tecnico

### Arquivo: `src/components/layout/MobileBottomNav.tsx`

| Mudanca | Detalhe |
|---|---|
| Sombra superior no nav | `boxShadow: '0 -4px 20px hsl(24 30% 5% / 0.5)'` |
| Borda top gradiente | Pseudo-elemento com gradiente dourado horizontal |
| Altura da barra | 68px para 72px |
| Icone ativo | Glow com `drop-shadow`, tamanho 24px, container com background `hsl(36 70% 50% / 0.12)` e borda sutil |
| Icone inativo | Cor `hsl(36 25% 45%)` para melhor visibilidade |
| Label ativo | `font-semibold`, cor `hsl(36 75% 55%)` mais vibrante |
| Label inativo | `text-[hsl(36,20%,42%)]` ligeiramente mais visivel |
| Indicador pill | Substituir por barra superior mais fina (2px) com cantos arredondados e glow |
| Botao "Mais" | Mesma estilizacao dos inativos para consistencia |

1 arquivo modificado.

