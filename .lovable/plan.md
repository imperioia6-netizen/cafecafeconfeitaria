

# Correcao Definitiva: Flash da Sidebar ao Navegar no Mobile

## Causa Raiz

O `AppLayout` e montado DENTRO de cada pagina (ex: `<AppLayout>conteudo</AppLayout>`). Quando o usuario navega entre rotas, o React desmonta e remonta o `AppLayout`. No momento da montagem:

1. `useIsMobile()` retorna `false` no primeiro render (o estado interno comeca como `undefined`, e `!!undefined = false`)
2. `useState(!isMobile)` resolve para `useState(!false)` = `useState(true)`
3. O `sidebarOpen` comeca como `true` -- o Sheet renderiza aberto
4. Somente depois, o `useEffect` roda e seta `setSidebarOpen(false)`
5. Esse ciclo abrir-fechar e o flash visivel

## Solucao

### Mudanca 1: `src/components/layout/AppLayout.tsx`

Substituir o estado inicial `useState(!isMobile)` por uma verificacao direta do tamanho da janela, sem depender do hook (que precisa de um ciclo de efeito):

```tsx
// ANTES:
const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

// DEPOIS:
const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
```

Isso garante que no mobile o estado JA comeca como `false`, sem precisar esperar o efeito. O Sheet nunca abre involuntariamente.

### Mudanca 2 (mesmo arquivo): Simplificar o useEffect

O `useEffect` atual tambem pode causar problemas ao setar `true` no desktop durante mudancas de rota. Simplificar para apenas fechar no mobile:

```tsx
useEffect(() => {
  if (isMobile) setSidebarOpen(false);
}, [location.pathname, isMobile]);
```

Remover o `else setSidebarOpen(true)` que forçava abertura no desktop a cada mudanca de rota.

## Resultado

- Zero flash ao navegar no mobile -- sidebar nunca abre involuntariamente
- Navegacao limpa e fluida entre todas as paginas
- Desktop continua funcionando normalmente (sidebar inicia aberta e mantem estado)

