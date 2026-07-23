-- Migration: Gastos Futuros
-- Adds future_expenses table

create table future_expenses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  category text default '',
  expected_amount numeric(12,2) not null check (expected_amount > 0),
  expected_date date not null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  created_at timestamptz default now()
);
