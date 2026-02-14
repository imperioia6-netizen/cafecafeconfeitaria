

# Correcao de Erros e Funcionalidades Pendentes

## Problema Principal: Erro de RLS

O usuario "Vitor" (`172b72ec-ba68-4a5c-81ee-50ceb3eb7935`) existe na tabela `profiles` mas **nao tem nenhuma role** na tabela `user_roles`. Sem role, tanto `is_owner()` quanto `is_employee()` retornam `false`, bloqueando todas as operacoes.

Alem disso, o trigger `handle_new_user` cria o perfil mas **nao atribui role automaticamente**.

### Correcao 1: Inserir role "owner" para o Vitor

Inserir diretamente na tabela `user_roles` a role `owner` para o usuario existente.

### Correcao 2: Atualizar trigger de signup

Modificar `handle_new_user` para atribuir automaticamente a role `employee` para novos usuarios (o primeiro usuario ja sera corrigido manualmente como `owner`).

### Correcao 3: Politicas RLS RESTRICTIVE

Todas as politicas foram criadas como **RESTRICTIVE** (sem `TO authenticated`), o que exige que TODAS passem simultaneamente. Precisamos recriar como **PERMISSIVE** para que baste uma politica passar.

Tabelas afetadas:
- `cash_registers` (4 politicas)
- `cash_closings` (3 politicas)
- `closing_details` (3 politicas)

---

## Funcionalidades Pendentes

O usuario mencionou que faltam aplicacoes. Vou listar o que sera implementado nesta rodada alem da correcao:

### 1. Perfil do Usuario (ADM / Funcionario / Cliente)

Pagina de perfil acessivel para cada tipo de usuario:
- **Owner/ADM**: Ve e edita todos os perfis, atribui roles
- **Funcionario**: Ve e edita apenas seu proprio perfil
- **Cliente**: Ve e edita seu perfil basico

Nova pagina `src/pages/Profile.tsx` com:
- Foto, nome, telefone, aniversario
- Nome e aniversario do familiar
- Badge mostrando a role do usuario

### 2. Tela de Gestao de Roles (dentro de Equipe)

Na pagina de Equipe (ja existente), adicionar:
- Dropdown para alterar role de cada membro (owner, employee, client)
- Protegido: apenas owner pode mudar roles

---

## Detalhes Tecnicos

### Migracao SQL

```sql
-- 1. Corrigir politicas RESTRICTIVE -> PERMISSIVE
-- Drop e recriar todas as politicas de cash_registers, cash_closings, closing_details

-- 2. Atualizar trigger para auto-atribuir role employee
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Insercao de dados

```sql
-- Atribuir owner ao Vitor
INSERT INTO user_roles (user_id, role) 
VALUES ('172b72ec-ba68-4a5c-81ee-50ceb3eb7935', 'owner');
```

### Novos Arquivos

- `src/pages/Profile.tsx` — Pagina de perfil do usuario logado
- Atualizar `src/App.tsx` — Nova rota `/profile`
- Atualizar `src/components/layout/AppSidebar.tsx` — Link para perfil
- Atualizar `src/pages/Team.tsx` — Adicionar gestao de roles

### Ordem de Execucao

1. Inserir role owner para Vitor (dados)
2. Migrar politicas RLS para PERMISSIVE
3. Atualizar trigger de signup
4. Criar pagina de Perfil
5. Atualizar Equipe com gestao de roles
6. Atualizar sidebar e rotas

