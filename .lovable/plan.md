

# Restaurar Avatar no Header do Cardapio

## Problema

O icone de avatar/perfil sumiu do header do cardapio digital. Na imagem, so aparece o icone do carrinho. Precisa adicionar o avatar de volta ao lado do carrinho.

## Alteracoes

### `src/pages/Cardapio.tsx`

- Importar `Avatar`, `AvatarFallback` de `@/components/ui/avatar` e o icone `UserCircle` do lucide
- No header, apos o botao do carrinho, adicionar um avatar circular:
  - Se o usuario estiver logado (simulando cliente), mostrar as iniciais do usuario
  - Se nao estiver logado, mostrar um icone generico de usuario (`UserCircle`)
- O avatar tera estilo consistente com o header escuro: borda sutil, fundo semi-transparente
- Para usuarios logados simulando, clicar no avatar pode acionar a saida da simulacao (aproveitando a funcionalidade existente do badge "Visao: Cliente")

### Layout do header atualizado

```text
[🍰 Cardapio]  [---busca---]  [carrinho] [avatar]
```

## Detalhes Tecnicos

- Buscar o nome do perfil via `supabase.from('profiles')` quando logado, similar ao que o `AppHeader` ja faz
- Mostrar iniciais no `AvatarFallback` com fundo accent
- Para visitantes anonimos, mostrar icone `UserCircle` com estilo sutil
- Garantir que toda a logica de carrinho, checkout, categorias e pedidos continue funcionando sem alteracoes

