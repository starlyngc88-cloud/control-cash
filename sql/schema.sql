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
