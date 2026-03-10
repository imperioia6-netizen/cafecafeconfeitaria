-- Coluna endereço em customers para cadastro completo (nome, telefone, email, endereço)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
