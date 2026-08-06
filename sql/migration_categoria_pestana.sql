-- Asocia cada categoría de gasto a una de las 3 pestañas de la ventana de gastos.
-- Valores: 'categoria' | 'disponible' | 'hucha'. Las existentes quedan en 'categoria'.
alter table expense_categories add column tab text not null default 'categoria';