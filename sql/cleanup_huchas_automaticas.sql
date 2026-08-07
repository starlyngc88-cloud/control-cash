-- Limpieza: eliminar las huchas creadas automáticamente desde Gastos Futuros.
-- Se identifican por tener descripción 'Gasto futuro' dentro de la categoría "Gastos futuros".
-- Los gastos futuros vinculados quedan SIN hucha (saving_id = null) para que
-- sea decisión del usuario asociar (o crear) una hucha manualmente.

-- 1) Desvincular los gastos futuros de las huchas automáticas
update future_expenses fe
set saving_id = null
where fe.saving_id in (
  select s.id
  from savings s
  join saving_categories sc on sc.id = s.category_id
  where sc.name = 'Gastos futuros'
    and s.description = 'Gasto futuro'
);

-- 2) Eliminar los movimientos de esas huchas
delete from saving_movements
where saving_id in (
  select s.id
  from savings s
  join saving_categories sc on sc.id = s.category_id
  where sc.name = 'Gastos futuros'
    and s.description = 'Gasto futuro'
);

-- 3) Eliminar las huchas automáticas
delete from savings s
using saving_categories sc
where sc.id = s.category_id
  and sc.name = 'Gastos futuros'
  and s.description = 'Gasto futuro';