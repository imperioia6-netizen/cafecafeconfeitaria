
-- Enums for CRM
CREATE TYPE public.customer_status AS ENUM ('ativo', 'inativo', 'novo');
CREATE TYPE public.crm_message_type AS ENUM ('aniversario_cliente', 'aniversario_familiar', 'reativacao', 'social_seller', 'upsell');
CREATE TYPE public.crm_message_status AS ENUM ('pendente', 'enviada', 'lida', 'erro');
CREATE TYPE public.social_lead_status AS ENUM ('novo_seguidor', 'mensagem_enviada', 'convertido', 'cliente');

-- Customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  instagram_handle TEXT,
  instagram_followers INTEGER DEFAULT 0,
  birthday DATE,
  family_name TEXT,
  family_birthday DATE,
  preferred_channel TEXT DEFAULT 'balcao',
  favorite_recipe_id UUID REFERENCES public.recipes(id),
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  status public.customer_status NOT NULL DEFAULT 'novo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage customers" ON public.customers FOR ALL USING (is_owner()) WITH CHECK (is_owner());
CREATE POLICY "Employee can read customers" ON public.customers FOR SELECT USING (is_employee());

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_customers_birthday ON public.customers(birthday);
CREATE INDEX idx_customers_family_birthday ON public.customers(family_birthday);
CREATE INDEX idx_customers_last_purchase ON public.customers(last_purchase_at);
CREATE INDEX idx_customers_status ON public.customers(status);

-- CRM Messages table
CREATE TABLE public.crm_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  message_type public.crm_message_type NOT NULL,
  message_content TEXT,
  status public.crm_message_status NOT NULL DEFAULT 'pendente',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage crm_messages" ON public.crm_messages FOR ALL USING (is_owner()) WITH CHECK (is_owner());
CREATE POLICY "Employee can read crm_messages" ON public.crm_messages FOR SELECT USING (is_employee());

CREATE INDEX idx_crm_messages_customer ON public.crm_messages(customer_id);
CREATE INDEX idx_crm_messages_status ON public.crm_messages(status);

-- Social Leads table
CREATE TABLE public.social_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instagram_handle TEXT NOT NULL,
  followers_count INTEGER DEFAULT 0,
  status public.social_lead_status NOT NULL DEFAULT 'novo_seguidor',
  customer_id UUID REFERENCES public.customers(id),
  offer_sent TEXT,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage social_leads" ON public.social_leads FOR ALL USING (is_owner()) WITH CHECK (is_owner());
CREATE POLICY "Employee can read social_leads" ON public.social_leads FOR SELECT USING (is_employee());

-- Influence Discounts table
CREATE TABLE public.influence_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  instagram_post_url TEXT,
  followers_at_time INTEGER DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  sale_id UUID REFERENCES public.sales(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.influence_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage influence_discounts" ON public.influence_discounts FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- CRM Settings table (key-value)
CREATE TABLE public.crm_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage crm_settings" ON public.crm_settings FOR ALL USING (is_owner()) WITH CHECK (is_owner());

CREATE TRIGGER update_crm_settings_updated_at BEFORE UPDATE ON public.crm_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add customer_id to sales
ALTER TABLE public.sales ADD COLUMN customer_id UUID REFERENCES public.customers(id);
