

# Atualizar Fotos dos Bolos por Nome

## Mapeamento Foto → Receitas

Cada foto sera copiada para `public/cakes/` e a `photo_url` sera atualizada para ambas as versoes (fatia e bolo inteiro) de cada receita:

| Foto | Receitas (fatia + inteiro) |
|------|---------------------------|
| abacaxi_com_creme.png | Abacaxi com Creme + Bolo Abacaxi com Creme |
| abacaxi_com_doce_de_leite.png | Abacaxi com Doce de Leite + Bolo Abacaxi com Doce de Leite |
| alpes-suiços.png | Alpes Suiço + Bolo Alpes Suiço |
| ameixa.png | Ameixa com Doce de Leite + Bolo Ameixa com Doce de Leite |
| beehgui.png | Beehgui + Bolo Beehgui |
| bem-casado.png | Bem Casado + Bolo Bem Casado |
| bicho_de_pé_com_brigadeiro.png | Bicho de Pé com Brigadeiro + Bolo Bicho de Pé com Brigadeiro |
| bicho_de_pé_com_morango.png | Bicho de Pé com Morango + Bolo Bicho de Pé com morango |
| bicho_de_pé.png | Bicho de Pé + Bolo Bicho de Pé |
| brigadeiro_branco_com_maracujá.png | Brigadeiro Branco com Maracujá (se existir) |

## Implementacao

1. **Copiar 10 imagens** de `user-uploads://` para `public/cakes/`
2. **Atualizar `photo_url`** de ~20 receitas no Supabase apontando para `/cakes/nome.png` (servido pelo dominio publicado)

As URLs usarao o formato relativo `/cakes/nome.png` que funciona tanto no preview quanto no dominio publicado.

