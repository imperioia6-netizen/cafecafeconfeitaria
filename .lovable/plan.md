

# Ocultar Barra de Scroll Lateral no Mobile

## Problema

No mobile, a barra de scroll lateral aparece visivelmente na tela, ocupando espaco e prejudicando a estetica da interface.

## Solucao

Adicionar uma regra CSS responsiva que oculta a scrollbar apenas no mobile, mantendo a funcionalidade de scroll por toque.

## Detalhes Tecnicos

### Arquivo: `src/index.css`

Adicionar na secao `@layer utilities` uma classe global que esconde a scrollbar no mobile usando media query:

```css
@media (max-width: 767px) {
  body {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  body::-webkit-scrollbar {
    display: none;
  }
}
```

Isso usa as mesmas tecnicas da classe `.no-scrollbar` que ja existe no projeto, mas aplicada diretamente ao `body` apenas em telas menores que `md` (768px).

1 arquivo, ~8 linhas adicionadas.

