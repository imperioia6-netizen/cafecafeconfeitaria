
# Corrigir Avatar no Cardapio: Menu de Escolha de Painel

## Problema

Na pagina do Cardapio (visao cliente), ao clicar no avatar, a funcao `exitSimulation()` e chamada diretamente (linha 316 de `Cardapio.tsx`), que faz `setViewAs(null)` e `navigate('/')` -- voltando automaticamente para o painel admin sem dar escolha ao usuario.

## Solucao

Substituir o botao simples do avatar por um `DropdownMenu` com as opcoes de troca de visao (Proprietario, Funcionario, Cliente), igual ao que ja existe no `AppHeader.tsx`. Assim o usuario pode escolher para qual painel deseja ir.

## Arquivo modificado

### `src/pages/Cardapio.tsx` (linha 315-323)

**Antes:**
```tsx
<button onClick={() => isSimulating ? exitSimulation() : navigate('/profile')} className="cursor-pointer">
  <Avatar ...>...</Avatar>
</button>
```

**Depois:**
Substituir por um `DropdownMenu` com:
- Item "Meu Perfil" (navega para `/profile` e sai da simulacao)
- Submenu "Trocar Visao" com opcoes: Proprietario (`setViewAs(null)` + `navigate('/')`), Funcionario (`setViewAs('employee')` + `navigate('/')`), Cliente (mantem na pagina atual)
- Item "Sair" (signOut)

Importar `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` dos componentes UI, e os icones `Eye`, `LogOut` do lucide-react.

## Detalhes tecnicos

- Reutilizar o mesmo padrao visual do dropdown do `AppHeader.tsx`
- A opcao ativa fica destacada com `bg-accent/20 font-semibold`
- Manter o avatar visual identico (tamanho, borda dourada)
- Ao trocar para Owner ou Employee, navegar para `/` (dashboard)
- Ao trocar para Cliente, manter em `/cardapio`
