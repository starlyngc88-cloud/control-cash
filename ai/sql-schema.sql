# SQL Schema completo - KellyCash

Todas las tablas incluyen `user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id)` para RLS multi-usuario.

```sql
-- People
create table people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Income Categories
create table income_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Income
create table income (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people(id) not null,
  amount numeric not null,
  description text,
  date date not null,
  category_id uuid references income_categories,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Expenses
create table expenses (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people(id) not null,
  amount numeric not null,
  description text,
  date date not null,
  budget_category_id uuid references budget_categories,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Budget Templates
create table budget_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Budget Categories
create table budget_categories (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references budget_templates(id) not null,
  name text not null,
  budgeted numeric default 0,
  parent_id uuid references budget_categories(id),
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Monthly Budgets
create table monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references budget_templates(id) not null,
  month date not null,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Saving Categories
create table saving_categories (
  id uuid primary key default gen_random_uuid(),
  name text,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Savings
create table savings (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  current_amount numeric,
  category_id uuid references saving_categories,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Saving Movements
create table saving_movements (
  id uuid primary key default gen_random_uuid(),
  saving_id uuid references savings(id),
  type text check (type in ('income', 'withdrawal')),
  amount numeric,
  notes text,
  movement_date date,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Future Expense Categories
create table future_expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Future Expenses
create table future_expenses (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  category text,
  category_id uuid references future_expense_categories,
  expected_amount numeric,
  expected_date date,
  status text check (status in ('planned', 'completed', 'cancelled')),
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Commitments
create table commitments (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  total_amount numeric,
  current_balance numeric,
  category_id uuid references budget_categories,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Commitment Payments
create table commitment_payments (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid references commitments(id),
  amount numeric,
  capital_amount numeric,
  date date,
  notes text,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

-- Auth / Users (admin-managed, no user_id needed)
create table allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text,
  active boolean default true,
  created_at timestamptz default now()
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  role text check (role in ('admin', 'user')),
  created_at timestamptz default now()
);
```

## RLS Policies

Ver `sql/rls-policies.sql` para políticas completas. Resumen:

- Tablas 1-14: `CREATE POLICY "users_own_<table>" ON <table> FOR ALL USING (user_id = auth.uid())`
- Tablas 15-16 (allowed_users, user_roles): `FOR ALL USING (EXISTS SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')`

## Migración

Ver `sql/rls-migration.sql` para agregar `user_id` a tablas existentes.
