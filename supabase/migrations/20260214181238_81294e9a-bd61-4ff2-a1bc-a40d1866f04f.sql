
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('owner', 'employee', 'client');

-- Enum for product category
CREATE TYPE public.product_category AS ENUM ('bolo', 'torta', 'salgado', 'bebida', 'doce', 'outro');

-- Enum for sales channel
CREATE TYPE public.sales_channel AS ENUM ('balcao', 'delivery', 'ifood');

-- Enum for payment method
CREATE TYPE public.payment_method AS ENUM ('pix', 'credito', 'debito', 'dinheiro', 'refeicao');

-- Enum for inventory status
CREATE TYPE public.inventory_status AS ENUM ('normal', 'atencao', 'critico');

-- Enum for alert type
CREATE TYPE public.alert_type AS ENUM ('estoque_baixo', 'validade_12h', 'desperdicio', 'outro');

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  birthday DATE,
  family_name TEXT,
  family_birthday DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recipes/Products
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  photo_url TEXT,
  slice_weight_g NUMERIC NOT NULL DEFAULT 250,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  category product_category NOT NULL DEFAULT 'bolo',
  direct_cost NUMERIC,
  min_stock INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Ingredients
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- Recipe ingredients (junction)
CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity_used NUMERIC NOT NULL DEFAULT 0
);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Productions
CREATE TABLE public.productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  operator_id UUID REFERENCES auth.users(id) NOT NULL,
  weight_produced_g NUMERIC NOT NULL,
  slices_generated INTEGER NOT NULL,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  produced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;

-- Inventory
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  production_id UUID REFERENCES public.productions(id) ON DELETE CASCADE NOT NULL,
  slices_available INTEGER NOT NULL DEFAULT 0,
  produced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status inventory_status NOT NULL DEFAULT 'normal',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES auth.users(id) NOT NULL,
  channel sales_channel NOT NULL DEFAULT 'balcao',
  payment_method payment_method NOT NULL DEFAULT 'dinheiro',
  total NUMERIC NOT NULL DEFAULT 0,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Sale items
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) NOT NULL,
  inventory_id UUID REFERENCES public.inventory(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type alert_type NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
  message TEXT,
  action_taken TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: is owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'owner')
$$;

-- Helper: is employee
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'employee')
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====== RLS POLICIES ======

-- user_roles: only owner can manage, authenticated can read own
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owner can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- recipes: owner CRUD, employee/client read
CREATE POLICY "Authenticated can read active recipes" ON public.recipes FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Owner can manage recipes" ON public.recipes FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- ingredients: owner CRUD, employee read
CREATE POLICY "Authenticated can read ingredients" ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage ingredients" ON public.ingredients FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- recipe_ingredients
CREATE POLICY "Authenticated can read recipe_ingredients" ON public.recipe_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage recipe_ingredients" ON public.recipe_ingredients FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- productions: employee can create, owner can do all
CREATE POLICY "Owner can manage productions" ON public.productions FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Employee can create productions" ON public.productions FOR INSERT TO authenticated WITH CHECK (public.is_employee() AND operator_id = auth.uid());
CREATE POLICY "Employee can read own productions" ON public.productions FOR SELECT TO authenticated USING (public.is_employee() AND operator_id = auth.uid());

-- inventory
CREATE POLICY "Authenticated can read inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage inventory" ON public.inventory FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Employee can update inventory" ON public.inventory FOR UPDATE TO authenticated USING (public.is_employee());

-- sales
CREATE POLICY "Owner can manage sales" ON public.sales FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Employee can create sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.is_employee() AND operator_id = auth.uid());
CREATE POLICY "Employee can read own sales" ON public.sales FOR SELECT TO authenticated USING (public.is_employee() AND operator_id = auth.uid());

-- sale_items
CREATE POLICY "Owner can manage sale_items" ON public.sale_items FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Employee can create sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (public.is_employee());
CREATE POLICY "Employee can read sale_items" ON public.sale_items FOR SELECT TO authenticated USING (public.is_employee());

-- alerts
CREATE POLICY "Owner can manage alerts" ON public.alerts FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Authenticated can read alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
