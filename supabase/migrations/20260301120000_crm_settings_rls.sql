-- Ajusta as políticas de RLS da tabela crm_settings
-- para permitir que qualquer usuário autenticado (TO authenticated)
-- possa criar/atualizar/ler configurações do CRM via aplicação.
-- 
-- Execute este arquivo uma vez no Supabase (ou deixe o CLI aplicar
-- as migrações) para que o botão "Salvar" em CRM > Config funcione
-- sem erro de RLS.

ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas, se existirem
DROP POLICY IF EXISTS "Owner can manage crm_settings" ON public.crm_settings;
DROP POLICY IF EXISTS "Authenticated manage crm_settings" ON public.crm_settings;
DROP POLICY IF EXISTS "Users can manage crm_settings" ON public.crm_settings;

-- Nova política: qualquer usuário autenticado pode gerenciar crm_settings
CREATE POLICY "Users can manage crm_settings"
ON public.crm_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

