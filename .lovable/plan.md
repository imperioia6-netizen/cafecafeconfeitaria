
# Corrigir Ocultacao da Scrollbar no Mobile

## Problema

A regra CSS foi adicionada dentro de `@layer utilities`, que tem prioridade baixa no Tailwind e pode ser sobrescrita. Alem disso, a scrollbar pode estar no elemento `html` e nao apenas no `body`.

## Solucao

Mover a regra para **fora** de qualquer `@layer` (no final do arquivo) e aplicar tanto em `html` quanto em `body`, garantindo especificidade maxima.

## Detalhes Tecnicos

### Arquivo: `src/index.css`

1. **Remover** a media query atual que esta dentro de `@layer utilities` (linhas 374-382)
2. **Adicionar** no final do arquivo, fora de qualquer layer:

```css
@media (max-width: 767px) {
  html,
  body {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  html::-webkit-scrollbar,
  body::-webkit-scrollbar {
    display: none;
  }
}
```

Ao ficar fora do `@layer`, a regra tem especificidade normal do CSS e nao sera sobrescrita pelo Tailwind. Aplicar em `html` e `body` garante que funcione independente de qual elemento gera a scrollbar.

1 arquivo, mover ~8 linhas.
