-- Income categories for Ingresos

create table income_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

alter table income add column category_id uuid references income_categories(id);
