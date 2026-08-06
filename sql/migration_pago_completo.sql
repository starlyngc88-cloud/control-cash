-- Marcar rubros/subcategorías como "pago completo" (cerrado aunque no llegue al 100%)
-- Agrega columna is_paid, no afecta datos existentes (default false)
alter table budget_categories add column is_paid boolean not null default false;
