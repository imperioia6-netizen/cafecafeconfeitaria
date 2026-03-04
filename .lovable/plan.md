

# Atualizar Fotos de Mais 10 Bolos

## Mapeamento Foto → Receitas

| Foto | Receitas (fatia + inteiro) | IDs |
|------|---------------------------|-----|
| cherry_preto.png | Cherry Preto + Bolo Cherry Preto | 1f4fc8dd, 4add2a86 |
| chocoberry.png | Chocoberry + Bolo Chocoberry | e5b86a55, eda09a03 |
| chocomix.png | Chocomix + Bolo Chocomix | 2b9d815b, 8049a1c2 |
| choconinho.png | Choconinho + Bolo Choconinho | ba9b7b25, 02ae07a0 |
| choconozes.png | Choconozes + Bolo Choconozes | 01907524, 284ae0a7 |
| cocada.png | cocada + Bolo Cocada | db39a6b1, 4074869b |
| crocante.png | Crocante + Bolo Crocante | 9786058b, b998526d |
| delicia_de_coco.png | Delícia de Coco + Bolo Delícia de Coco | 7ce21eb6, fbd496b3 |
| delicia_de_mousse_branco.png | Delicia de Mousse Branco + Bolo Delicia de Mousse Branco | 5808d51c, f1188fa8 |
| dois_amores.png | Dois Amores + Bolo Dois Amores | bdecdbf4, 2f00c11c |

## Implementacao

1. Copiar 10 imagens de `user-uploads://` para `public/cakes/` (normalizando nomes sem acentos)
2. Atualizar `photo_url` de 20 receitas no Supabase via SQL de dados

