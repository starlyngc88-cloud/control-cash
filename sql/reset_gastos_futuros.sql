-- Migration simplificada: Categorías planas (sin subcategorías)

create table if not exists future_expense_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'future_expenses' and column_name = 'category_id'
  ) then
    alter table future_expenses add column category_id uuid references future_expense_categories(id);
  end if;
end $$;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'future_expense_categories' and column_name = 'parent_id'
  ) then
    alter table future_expense_categories drop column parent_id;
  end if;
end $$;

-- Elimina todos los datos de Gastos Futuros (mantiene las tablas)
delete from future_expenses;
delete from future_expense_categories;
