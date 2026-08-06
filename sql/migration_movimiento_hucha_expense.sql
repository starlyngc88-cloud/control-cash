-- Vínculo movimientos de hucha ↔ gasto que los origina.
-- Permite revertir el saldo de la hucha al eliminar el gasto (p.ej. Guáldalo desde disponible).
alter table saving_movements
  add column expense_id uuid references expenses(id) on delete set null;

create index if not exists idx_saving_movements_expense_id on saving_movements (expense_id);