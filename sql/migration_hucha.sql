-- Migration: La Hucha
-- Adds savings and saving_movements tables

create table savings (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text default '',
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
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
