-- Elimina todas las plantillas de presupuesto excepto "Modelo Base"
-- También elimina sus categorías y presupuestos mensuales asociados

delete from monthly_budgets
where template_id in (
  select id from budget_templates where lower(name) != 'modelo base'
);

delete from expenses
where budget_category_id in (
  select bc.id from budget_categories bc
  join budget_templates bt on bc.template_id = bt.id
  where lower(bt.name) != 'modelo base'
);

delete from budget_categories
where template_id in (
  select id from budget_templates where lower(name) != 'modelo base'
);

delete from budget_templates
where lower(name) != 'modelo base';
