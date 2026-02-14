
-- 1. Inserir role owner para o Vitor
INSERT INTO public.user_roles (user_id, role)
VALUES ('172b72ec-ba68-4a5c-81ee-50ceb3eb7935', 'owner')
ON CONFLICT DO NOTHING;

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

-- 3. Recriar trigger (caso nao exista)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Corrigir politicas RESTRICTIVE -> PERMISSIVE para cash_registers
DROP POLICY IF EXISTS "Employee can insert cash_registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Employee can read cash_registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Employee can update own cash_registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Owner can manage cash_registers" ON public.cash_registers;

CREATE POLICY "Owner can manage cash_registers" ON public.cash_registers
  FOR ALL TO authenticated USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY "Employee can read cash_registers" ON public.cash_registers
  FOR SELECT TO authenticated USING (is_employee());

CREATE POLICY "Employee can insert cash_registers" ON public.cash_registers
  FOR INSERT TO authenticated WITH CHECK (is_employee() AND opened_by = auth.uid());

CREATE POLICY "Employee can update own cash_registers" ON public.cash_registers
  FOR UPDATE TO authenticated USING (is_employee() AND opened_by = auth.uid());

-- 5. Corrigir politicas para cash_closings
DROP POLICY IF EXISTS "Employee can insert cash_closings" ON public.cash_closings;
DROP POLICY IF EXISTS "Employee can read cash_closings" ON public.cash_closings;
DROP POLICY IF EXISTS "Owner can manage cash_closings" ON public.cash_closings;

CREATE POLICY "Owner can manage cash_closings" ON public.cash_closings
  FOR ALL TO authenticated USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY "Employee can read cash_closings" ON public.cash_closings
  FOR SELECT TO authenticated USING (is_employee());

CREATE POLICY "Employee can insert cash_closings" ON public.cash_closings
  FOR INSERT TO authenticated WITH CHECK (is_employee() AND closed_by = auth.uid());

-- 6. Corrigir politicas para closing_details
DROP POLICY IF EXISTS "Employee can insert closing_details" ON public.closing_details;
DROP POLICY IF EXISTS "Employee can read closing_details" ON public.closing_details;
DROP POLICY IF EXISTS "Owner can manage closing_details" ON public.closing_details;

CREATE POLICY "Owner can manage closing_details" ON public.closing_details
  FOR ALL TO authenticated USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY "Employee can read closing_details" ON public.closing_details
  FOR SELECT TO authenticated USING (is_employee());

CREATE POLICY "Employee can insert closing_details" ON public.closing_details
  FOR INSERT TO authenticated WITH CHECK (is_employee());

-- 7. Corrigir politicas RESTRICTIVE em outras tabelas afetadas
-- profiles
DROP POLICY IF EXISTS "Owner can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owner can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Owner can manage all profiles" ON public.profiles
  FOR ALL TO authenticated USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- user_roles
DROP POLICY IF EXISTS "Owner can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owner can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Owner can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
