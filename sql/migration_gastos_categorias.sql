-- Migration: Categorías para Gastos

create table expense_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

alter table expenses add column expense_category_id uuid references expense_categories(id);
