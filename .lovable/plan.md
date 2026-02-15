
# Remover badge "Delivery" ao lado do logo no header

## O que muda

Remover o badge laranja/dourado que aparece ao lado do texto "Cardapio" no header fixo quando o modo Delivery esta selecionado. O seletor de modo (No Local / Delivery) ja existe mais abaixo na pagina, entao essa indicacao duplicada e desnecessaria.

## Detalhe tecnico

### Arquivo: `src/pages/Cardapio.tsx`

Remover as linhas 291-293 que renderizam o badge condicional:

```tsx
// REMOVER:
{deliveryMode === 'delivery' && (
  <span className="text-xs font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded-full">Delivery</span>
)}
```

O titulo do header ficara apenas com "Cardapio" independente do modo selecionado.
