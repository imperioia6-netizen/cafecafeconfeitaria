

# Cadastro com Perfil de Usuario e Funcionario

## Objetivo

Aprimorar o fluxo de cadastro (Auth.tsx) para coletar dados completos do perfil e permitir escolher o tipo de conta: **Cliente** ou **Funcionario**. Alem disso, permitir que o Owner cadastre funcionarios diretamente pela pagina de Equipe.

## Alteracoes

### 1. Formulario de Cadastro Publico (`src/pages/Auth.tsx`)

Adicionar campos extras no modo de cadastro:
- **Telefone** (opcional)
- **Aniversario** (opcional)  
- **Tipo de conta**: seletor entre "Cliente" e "Funcionario"

Apos o `signUp` com sucesso, os dados extras (telefone, birthday) serao salvos no `user_metadata` do Supabase Auth para que o trigger `handle_new_user` possa usa-los.

### 2. Atualizar Trigger `handle_new_user` (Migracao SQL)

Modificar a funcao para:
- Ler o campo `role` do `raw_user_meta_data` (default: 'client')
- Ler `phone` e `birthday` do metadata e salvar no perfil
- Atribuir a role correta (`client` ou `employee`) na tabela `user_roles`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role text;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  INSERT INTO public.profiles (user_id, name, phone, birthday)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    CASE WHEN NEW.raw_user_meta_data->>'birthday' IS NOT NULL 
         THEN (NEW.raw_user_meta_data->>'birthday')::date 
         ELSE NULL END
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role::app_role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 3. Atualizar `signUp` no `useAuth.tsx`

Passar os campos extras (phone, birthday, role) no `user_metadata`:

```typescript
signUp(email, password, name, { phone, birthday, role })
```

### 4. Adicionar Cadastro de Funcionario na Equipe (`src/pages/Team.tsx`)

Adicionar um botao "Novo Funcionario" (visivel apenas para Owners) que abre um dialog com:
- Nome, Email, Senha temporaria
- Telefone, Aniversario
- Criar a conta via `supabase.auth.signUp` com role 'employee' no metadata

### 5. Adicionar role `client` ao tipo `app_role` (Migracao SQL)

Verificar se ja existe. Se nao:
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
```

## Detalhes Tecnicos

### Arquivos alterados:
- `src/pages/Auth.tsx` -- campos extras no formulario de cadastro
- `src/hooks/useAuth.tsx` -- atualizar `signUp` para aceitar dados extras
- `src/pages/Team.tsx` -- botao e dialog para cadastrar funcionario
- Migracao SQL -- atualizar trigger e enum

### Fluxo:
```text
Cadastro Publico:
  [Form: nome, email, senha, telefone, aniversario, tipo]
    -> signUp com metadata
    -> Trigger cria profile + role automaticamente

Cadastro pelo Owner (Equipe):
  [Dialog: nome, email, senha, telefone]
    -> signUp com metadata { role: 'employee' }
    -> Trigger cria profile + role 'employee'
```

### Estilo visual:
- Campos extras seguem o mesmo padrao visual do formulario atual (input-glow, bg-white/5, border-white/10)
- Seletor de tipo de conta usa pills/tabs estilizadas com dourado
- Dialog de novo funcionario usa glass-card consistente com o tema
