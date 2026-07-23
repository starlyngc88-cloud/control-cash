-- Migration: Categorías para Gastos Futuros

create table future_expense_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

alter table future_expenses add column category_id uuid references future_expense_categories(id);
