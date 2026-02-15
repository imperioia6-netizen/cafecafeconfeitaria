

# Corrigir Avatar e Navegacao no Cardapio

## Problema

O avatar no header do cardapio nao tem acao ao clicar para usuarios nao-simulando. O botao esta com `onClick={undefined}`, entao nada acontece. Usuarios anonimos tambem nao tem como fazer login.

## Alteracoes

### `src/pages/Cardapio.tsx`

1. **Avatar clicavel para perfil**: Trocar `onClick={isSimulating ? exitSimulation : undefined}` por `onClick={() => isSimulating ? exitSimulation() : navigate('/profile')}`
   - Usuarios logados em simulacao: clicam para sair da simulacao
   - Usuarios logados normais: clicam para ir ao perfil

2. **Icone anonimo clicavel para login**: Trocar o `<div>` do icone `UserCircle` por um `<button>` com `onClick={() => navigate('/auth')}` para que visitantes possam fazer login

## Detalhes Tecnicos

- Linha ~199: mudar de `onClick={isSimulating ? exitSimulation : undefined}` para `onClick={() => isSimulating ? exitSimulation() : navigate('/profile')}`
- Linha ~208: mudar `<div>` para `<button onClick={() => navigate('/auth')}>`
- O `navigate` ja esta importado e disponivel no componente
- Nenhuma outra alteracao necessaria

