
# Remover Caixinhas dos Icones no Dashboard

## O que sera feito

Remover o container quadrado arredondado (`rounded-xl p-2.5 bg-primary/10`) que envolve os icones nos KPI cards do dashboard. Os icones ficarao soltos ao lado do titulo, sem background -- visual mais limpo e moderno.

## Arquivo modificado

### `src/pages/Index.tsx` (linha 53-55)

**Antes:**
```
<div className="rounded-xl p-2.5 animate-float bg-primary/10">
  <Icon className="h-4 w-4 text-primary" />
</div>
```

**Depois:**
```
<Icon className="h-5 w-5 text-primary" />
```

- Remover a `div` wrapper com background, padding e border-radius
- Manter o icone direto no flex container
- Aumentar levemente o icone de `h-4 w-4` para `h-5 w-5` para compensar a ausencia do container
- Para o card "Faturamento" (primeiro/destacado), manter a cor accent com o glow sutil

1 arquivo, 1 mudanca cirurgica.
