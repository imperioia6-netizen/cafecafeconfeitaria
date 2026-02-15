
# Efeito Cinematografico no Card "Faturamento"

## O que sera feito

Adicionar profundidade e destaque cinematografico ao card marrom do "Faturamento" (primeiro KPI), fazendo-o "flutuar" acima dos demais com sombras ricas, borda luminosa mais intensa e um glow ambiental sutil.

## Arquivo modificado

### `src/pages/Index.tsx` (KpiCard, linhas 43-48)

Atualizar o `style` do card quando `isFirst` para incluir:

- **Box-shadow multi-camada**: sombra profunda escura + glow dourado ambiental ao redor
- **Borda sutil dourada**: `border: 1px solid hsl(36 70% 50% / 0.25)` para definicao
- **Transform elevado**: `translateY(-2px)` para sensacao de flutuacao sobre os outros cards
- **Gradiente mais rico**: adicionar um terceiro stop no gradiente para mais dimensao

**Antes:**
```tsx
style={isFirst ? {
  background: 'linear-gradient(135deg, hsl(24 60% 20%), hsl(24 50% 14%))',
  color: 'hsl(36 40% 95%)',
} : undefined}
```

**Depois:**
```tsx
style={isFirst ? {
  background: 'linear-gradient(135deg, hsl(24 60% 22%), hsl(24 55% 16%) 50%, hsl(24 45% 11%))',
  color: 'hsl(36 40% 95%)',
  border: '1px solid hsl(36 70% 50% / 0.2)',
  boxShadow: '0 8px 32px hsl(24 40% 8% / 0.5), 0 2px 8px hsl(24 30% 10% / 0.3), 0 0 20px hsl(36 70% 50% / 0.08)',
  transform: 'translateY(-2px)',
} : undefined}
```

### `src/index.css`

Adicionar regra para hover especifico do card destacado com elevacao extra:
```css
.card-cinematic.border-shine:hover {
  transform: translateY(-6px) scale(1.008);
  box-shadow: 0 12px 40px hsl(24 40% 8% / 0.6), 0 4px 12px hsl(24 30% 10% / 0.4), 0 0 28px hsl(36 70% 50% / 0.12);
}
```

## Resultado

O card "Faturamento" ganha presenca cinematografica -- flutua levemente acima dos outros, com sombra profunda e um glow dourado ambiental sutil que o destaca como o KPI principal do dashboard.
