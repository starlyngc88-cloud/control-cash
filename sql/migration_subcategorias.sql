-- Agregar columna parent_id para subcategorías
-- NULL = categoría raíz, no NULL = subcategoría
alter table budget_categories add column parent_id uuid references budget_categories(id);
