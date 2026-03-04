

# Atualizar Fotos de Mais 8 Bolos

## Mapeamento Foto → Receitas

| Foto | Receitas (fatia + inteiro) | IDs |
|------|---------------------------|-----|
| brigadeiro_branco.png | Brigadeiro Branco + Bolo Brigadeiro Branco | bcc9f552, 994b3c1d |
| brigadeiro_preto_com_maracuja.png | Brigadeiro com Mousse de Maracujá + Bolo Brigadeiro com Mousse de Maracujá | c61e0eb1, 5f3b1bf0 |
| brigadeiro.png | Brigadeiro + Bolo Brigadeiro | 414b8793, 14221fcb |
| cafe.png | Café + Bolo Café | 3c33812f, c2778776 |
| camafeu-de-nozes.png | Camafeu de Nozes + Bolo Camafeu de Nozes | dc39ea3c, 90ec69da |
| cappuccino.png | Cappuccino + Bolo Cappuccino | f6b7ef75, ac3cde0f |
| casadinho.png | Casadinho + Bolo Casadinho | f4ff3b22, 0c9cdfcc |
| cherry_branco.png | Cherry Branco + Bolo Cherry Branco | 4cb74544, 0ef8edb0 |

## Implementacao

1. Copiar 8 imagens de `user-uploads://` para `public/cakes/` (normalizando nomes sem acentos)
2. Atualizar `photo_url` de 16 receitas no Supabase via SQL de dados

