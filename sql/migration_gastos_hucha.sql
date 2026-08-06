-- Vínculo gastos ↔ hucha (saving): permite marcar que un gasto se pagó desde una hucha.
-- Gastos con saving_id no nulo aparecen en la vista "Gastos por Hucha".
alter table expenses add column saving_id uuid references savings(id);