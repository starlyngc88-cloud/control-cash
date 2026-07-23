-- Migration: Categorías para La Hucha

create table saving_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

alter table savings add column category_id uuid references saving_categories(id);
