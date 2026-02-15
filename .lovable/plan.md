

# Melhorar Design da Secao de Categorias

## O que muda

Redesign das pills de categorias na pagina `/cardapio` para um visual mais refinado, com tipografia melhorada e melhor espacamento.

## Alteracoes em `src/pages/Cardapio.tsx`

### Secao de categorias (linhas ~221-248)

- **Titulo "Nossos Produtos"**: trocar fonte de Playfair Display para `'DM Sans'` com `font-semibold text-lg tracking-tight` para consistencia com o restante dos cards
- **Separador dourado**: reduzir opacidade e adicionar margem inferior maior para mais respiro
- **Pills de categoria**:
  - Aumentar padding horizontal de `px-4` para `px-5`
  - Trocar fonte para `'DM Sans'` com `text-[13px] font-medium tracking-wide`
  - Estado ativo: manter `bg-accent text-accent-foreground` com `shadow-sm` em vez de `shadow-md glow-accent` (mais sutil)
  - Estado inativo: usar `bg-card border border-border/60` em vez de `bg-secondary` para combinar com os cards de produto (visual creme/bege)
  - Aumentar gap entre pills de `gap-2` para `gap-2.5`
  - Altura consistente com `py-2` mantido

### Resultado visual esperado:

```text
Nossos Produtos (DM Sans, semibold)
─────────────────────────────────
[Todas] [Bolos] [Tortas] [Salgados] [Bebidas] [Doces] [Outros]
  ^ativo    ^inativos com fundo creme claro e borda sutil
```

### Arquivo alterado:
- `src/pages/Cardapio.tsx`

