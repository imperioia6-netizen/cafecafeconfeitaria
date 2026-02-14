

# Enriquecer Ficha do Funcionario com Todas as Informacoes do Perfil

## Objetivo

Garantir que a ficha lateral (EmployeeSheet) exiba **todos** os dados disponiveis do perfil do funcionario, incluindo campos que atualmente nao aparecem.

## Dados disponiveis na tabela `profiles`

| Campo | Atual na ficha? | Acao |
|-------|-----------------|------|
| name | Sim | Manter |
| phone | Sim | Manter |
| birthday | Sim | Manter |
| family_name | Nao | Adicionar |
| family_birthday | Nao | Adicionar |
| photo_url | Nao | Adicionar (exibir foto real no avatar se existir) |
| service_rating | Sim | Manter |
| service_notes | Sim | Manter |
| roles (da user_roles) | Sim | Manter |
| email (do auth.users) | Nao | Adicionar via user metadata |
| created_at | Nao | Adicionar como "Membro desde" |

## Alteracoes

### 1. Card na pagina Team (`src/pages/Team.tsx`)

- Exibir telefone e aniversario de forma mais visivel no card
- Mostrar foto real do usuario no Avatar quando `photo_url` existir

### 2. EmployeeSheet (`src/components/team/EmployeeSheet.tsx`)

Adicionar secao **Dados Pessoais** completa antes dos KPIs:

```
--- DADOS PESSOAIS ---
Nome:              Vitor
Telefone:          (11) 99999-9999
Aniversario:       14 de fevereiro
Familiar:          Maria (esposa)
Aniv. Familiar:    22 de marco
Membro desde:      janeiro de 2025
```

- Usar Avatar com `photo_url` real quando disponivel (AvatarImage + AvatarFallback)
- Organizar os dados pessoais em rows com icones (Phone, Cake, Heart, Calendar, Mail)
- Mostrar "Membro desde" usando `created_at` do perfil

### 3. Hook useTeamMembers (`src/hooks/useTeam.ts`)

- Garantir que o select de profiles inclui todos os campos: `family_name`, `family_birthday`, `photo_url`, `created_at`, `service_rating`, `service_notes`
- Ja faz `select('*')` entao todos os campos ja vem -- nenhuma alteracao necessaria no hook

## Detalhes Tecnicos

- Importar `AvatarImage` do componente Avatar para exibir foto real
- Usar icones do Lucide: `Phone`, `Cake`, `Heart`, `Calendar`, `Clock` para os campos pessoais
- Campos vazios (null) nao serao exibidos, mantendo a ficha limpa
- Nenhuma alteracao de banco de dados necessaria -- todos os campos ja existem

