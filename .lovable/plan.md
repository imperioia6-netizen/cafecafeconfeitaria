

# Menu do Avatar no Header com Troca de Perfil

## Resumo

Ao clicar no avatar no canto superior direito, abrir um dropdown menu com opcoes de navegacao e troca de visao. Remover "Meu Perfil" da sidebar.

## Alteracoes

### 1. AppHeader (`src/components/layout/AppHeader.tsx`)

- Substituir o botao do avatar por um `DropdownMenu` (Radix UI, ja instalado)
- Opcoes do menu:
  - **Meu Perfil** -- navega para `/profile`
  - **Separador** (somente se owner)
  - **Trocar Visao** (somente owner): sub-opcoes para alternar entre visao "Proprietario", "Funcionario" e "Cliente"
  - **Separador**
  - **Sair** -- executa signOut
- A troca de visao nao altera roles no banco -- apenas simula a visao restrita no frontend (state local ou context)

### 2. AppSidebar (`src/components/layout/AppSidebar.tsx`)

- Remover o item "Meu Perfil" do grupo "Pessoal" no `navGroups`
- Se o grupo "Pessoal" ficar vazio (usuario nao-owner nao ve "Equipe"), o grupo nao sera renderizado

### 3. Contexto de Visao Simulada

- Adicionar estado `viewAs` no `AuthContext` (`useAuth.tsx`): `'owner' | 'employee' | 'client' | null`
- Quando `viewAs` esta ativo, `isOwner` e `isEmployee` refletem o perfil simulado em vez do real
- Somente owners podem ativar -- validado no contexto
- Um badge no header indica quando esta em modo simulado (ex: "Visao: Funcionario") com botao para voltar

## Detalhes Tecnicos

- Usar `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuSub` do shadcn/ui (ja disponivel)
- O dropdown tera `bg-popover` solido e `z-50` para evitar transparencia
- A troca de visao e puramente client-side -- nao modifica `user_roles` no banco
- O `viewAs` sera armazenado em estado React (nao localStorage) para seguranca
