-- Migración RLS: añadir columna user_id a todas las tablas
-- Ejecutar ANTES de rls-policies.sql
-- Paso 1: Obtener tu user_id ejecutando: SELECT auth.uid();

-- Paso 2: Reemplaza 'TU_USER_ID' con el UUID obtenido

-- Paso 3: Ejecutar este script

DO $$
DECLARE
  my_uid UUID := '6b6a399b-515c-4e54-be68-9bbd418014df';
BEGIN

ALTER TABLE people ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE people SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE income_categories ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE income_categories SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE income ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE income SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE expenses SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE budget_templates ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE budget_templates SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE budget_categories ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE budget_categories SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE monthly_budgets ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE monthly_budgets SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE saving_categories ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE saving_categories SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE savings ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE savings SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE saving_movements ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE saving_movements SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE future_expense_categories ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE future_expense_categories SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE future_expenses ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE future_expenses SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE commitments ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE commitments SET user_id = my_uid WHERE user_id IS NULL;

ALTER TABLE commitment_payments ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
UPDATE commitment_payments SET user_id = my_uid WHERE user_id IS NULL;

END $$;