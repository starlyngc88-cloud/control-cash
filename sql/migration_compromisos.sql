-- Migration: Compromisos (créditos grandes)

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
