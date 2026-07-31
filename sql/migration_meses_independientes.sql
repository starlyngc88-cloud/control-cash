-- Meses financieros independientes de la plantilla base.
--
-- budget_categories pasa a tener dos orígenes:
--   * template_id (rubros de la plantilla "Modelo base")
--   * monthly_budget_id (copia propia de cada mes, creada al abrir el mes)
--
-- Editar la plantilla ya no afecta a los meses creados; cada mes tiene su copia.
-- Ejecutar una sola vez. Después de esto, los nuevos meses se crean copiando
-- los rubros de la plantilla automáticamente desde la app.

-- template_id deja de ser obligatorio (los rubros de un mes no lo tienen)
alter table budget_categories alter column template_id drop not null;

-- Origen mensual de cada rubro (null = rubro de plantilla)
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_name = 'budget_categories' and column_name = 'monthly_budget_id') then
    alter table budget_categories add column monthly_budget_id uuid references monthly_budgets(id) on delete cascade;
  end if;
end $$;

-- Backfill: copiar los rubros de la plantilla a cada mes ya creado y
-- reasignar los gastos del mes a las copias.
do $$
declare
  mb record;
  cat record;
  new_cat_id uuid;
begin
  create temp table cat_map (old_id uuid primary key, new_id uuid) on commit drop;

  for mb in select * from monthly_budgets order by month loop
    truncate cat_map;

    -- Rubros raíz
    for cat in select * from budget_categories
               where template_id = mb.template_id and parent_id is null
               order by id loop
      insert into budget_categories (monthly_budget_id, name, budgeted)
      values (mb.id, cat.name, cat.budgeted)
      returning id into new_cat_id;
      insert into cat_map values (cat.id, new_cat_id);
    end loop;

    -- Subcategorías (mapeando el padre)
    for cat in select * from budget_categories
               where template_id = mb.template_id and parent_id is not null
               order by id loop
      insert into budget_categories (monthly_budget_id, name, budgeted, parent_id)
      values (mb.id, cat.name, cat.budgeted,
              (select cm.new_id from cat_map cm where cm.old_id = cat.parent_id));
    end loop;

    -- Reasignar gastos de ese mes a las copias del mes
    update expenses e
      set budget_category_id = cm.new_id
      from cat_map cm
      where e.budget_category_id = cm.old_id
        and e.date >= mb.month
        and e.date < (mb.month + interval '1 month')::date;
  end loop;
end $$;
