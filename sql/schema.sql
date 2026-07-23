-- KellyCash v0.1

create table people (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

create table income (
  id uuid default gen_random_uuid() primary key,
  person_id uuid not null references people(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

create table expenses (
  id uuid default gen_random_uuid() primary key,
  person_id uuid not null references people(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Budget tables

create table budget_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

create table budget_categories (
  id uuid default gen_random_uuid() primary key,
  template_id uuid not null references budget_templates(id) on delete cascade,
  name text not null,
  budgeted numeric(12,2) not null check (budgeted >= 0)
);

create table monthly_budgets (
  id uuid default gen_random_uuid() primary key,
  template_id uuid not null references budget_templates(id),
  month date not null,
  created_at timestamptz default now(),
  unique(month)
);

alter table expenses add column budget_category_id uuid references budget_categories(id);

-- La Hucha

create table saving_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

create table savings (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text default '',
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  category_id uuid references saving_categories(id),
  created_at timestamptz default now()
);

create table saving_movements (
  id uuid default gen_random_uuid() primary key,
  saving_id uuid not null references savings(id) on delete cascade,
  type text not null check (type in ('income', 'withdrawal')),
  amount numeric(12,2) not null check (amount > 0),
  notes text default '',
  movement_date date not null default current_date,
  created_at timestamptz default now()
);

-- Gastos Futuros

create table future_expense_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

create table future_expenses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  category text default '',
  category_id uuid references future_expense_categories(id),
  expected_amount numeric(12,2) not null check (expected_amount > 0),
  expected_date date not null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

-- Compromisos

create table commitments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text default '',
  total_amount numeric(12,2) not null check (total_amount > 0),
  current_balance numeric(12,2) not null check (current_balance >= 0),
  category_id uuid references budget_categories(id),
  created_at timestamptz default now()
);

create table commitment_payments (
  id uuid default gen_random_uuid() primary key,
  commitment_id uuid not null references commitments(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  capital_amount numeric(12,2) not null check (capital_amount > 0),
  date date not null default current_date,
  notes text default '',
  created_at timestamptz default now()
);

-- Auth / Authorization

create table allowed_users (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references allowed_users(id) on delete cascade,
  role text not null check (role in ('admin', 'user')),
  created_at timestamptz default now(),
  unique(user_id)
);
