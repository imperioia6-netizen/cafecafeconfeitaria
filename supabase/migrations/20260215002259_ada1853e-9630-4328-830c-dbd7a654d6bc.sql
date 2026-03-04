
-- Create order_status enum
CREATE TYPE order_status AS ENUM ('aberto', 'finalizado', 'cancelado');

-- Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL,
  order_number text,
  table_number text,
  customer_name text,
  status order_status NOT NULL DEFAULT 'aberto',
  channel sales_channel NOT NULL DEFAULT 'balcao',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create order_items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id),
  inventory_id uuid REFERENCES public.inventory(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS for orders
CREATE POLICY "Owner can manage orders" ON public.orders FOR ALL USING (is_owner()) WITH CHECK (is_owner());
CREATE POLICY "Employee can read orders" ON public.orders FOR SELECT USING (is_employee());
CREATE POLICY "Employee can insert orders" ON public.orders FOR INSERT WITH CHECK (is_employee() AND operator_id = auth.uid());
CREATE POLICY "Employee can update own orders" ON public.orders FOR UPDATE USING (is_employee() AND operator_id = auth.uid());

-- RLS for order_items
CREATE POLICY "Owner can manage order_items" ON public.order_items FOR ALL USING (is_owner()) WITH CHECK (is_owner());
CREATE POLICY "Employee can read order_items" ON public.order_items FOR SELECT USING (is_employee());
CREATE POLICY "Employee can insert order_items" ON public.order_items FOR INSERT WITH CHECK (is_employee());
CREATE POLICY "Employee can delete order_items" ON public.order_items FOR DELETE USING (is_employee());
