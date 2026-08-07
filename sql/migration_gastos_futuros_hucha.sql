-- Migration: Gastos Futuros Vinculados con Hucha
-- 1) Crea la categoría "Gastos futuros" en las huchas (si no existe)
-- 2) Añade la columna de vínculo saving_id en future_expenses
-- 3) Crear una hucha para cada gasto futuro existente (solo si aún no tiene vínculo)

-- 1) Categoría para agrupar huchas creadas desde Gastos Futuros
insert into saving_categories (name)
select 'Gastos futuros'
where not exists (select 1 from saving_categories where name = 'Gastos futuros');

-- 2) Columna de vínculo gasto futuro <-> hucha
alter table future_expenses
  add column if not exists saving_id uuid references savings(id) on delete set null;

-- 3) Para los gastos futuros ya existentes sin hucha vinculada,
--    crear una hucha automática en la categoría "Gastos futuros"
do $$
declare
  cat_id uuid;
  r record;
  new_saving_id uuid;
begin
  select id into cat_id from saving_categories where name = 'Gastos futuros';
  for r in
    select fe.id as fe_id, fe.title
    from future_expenses fe
    where fe.saving_id is null
  loop
    insert into savings (name, description, current_amount, category_id)
    values (r.title, 'Gasto futuro', 0, cat_id)
    returning id into new_saving_id;

    update future_expenses
    set saving_id = new_saving_id
    where id = r.fe_id;
  end loop;
end $$;