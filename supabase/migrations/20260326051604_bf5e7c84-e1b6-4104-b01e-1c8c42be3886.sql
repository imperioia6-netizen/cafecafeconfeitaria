
create table public.agent_queries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  remote_jid text not null,
  query_text text not null,
  response_text text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

alter table public.agent_queries enable row level security;

create policy "Owner can manage agent_queries"
on public.agent_queries for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "Employee can read agent_queries"
on public.agent_queries for select
to authenticated
using (public.is_employee());

create policy "Service role can insert agent_queries"
on public.agent_queries for insert
to service_role
with check (true);

create policy "Service role can update agent_queries"
on public.agent_queries for update
to service_role
using (true)
with check (true);
