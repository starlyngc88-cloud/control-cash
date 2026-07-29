-- Políticas RLS para KellyCash
-- - Usuarios regulares: solo ven sus propios datos (user_id = auth.uid())
-- - Admins: ven todos los datos (bypass por email-based lookup)
--
-- NOTA: El check de admin usa email del JWT en vez de auth.uid()
-- porque user_roles.user_id referencia allowed_users.id, NO auth.users.id.
-- auth.uid() NUNCA coincidiría con user_roles.user_id.
--
-- Las políticas para allowed_users y user_roles están en migration_auth.sql
-- usando el mismo patrón de email-based lookup.

-- 1. PEOPLE
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_people" ON people;
CREATE POLICY "users_own_people" ON people
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 2. INCOME_CATEGORIES
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_income_categories" ON income_categories;
CREATE POLICY "users_own_income_categories" ON income_categories
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 3. INCOME
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_income" ON income;
CREATE POLICY "users_own_income" ON income
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 4. EXPENSES
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_expenses" ON expenses;
CREATE POLICY "users_own_expenses" ON expenses
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 5. BUDGET_TEMPLATES
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_budget_templates" ON budget_templates;
CREATE POLICY "users_own_budget_templates" ON budget_templates
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 6. BUDGET_CATEGORIES
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_budget_categories" ON budget_categories;
CREATE POLICY "users_own_budget_categories" ON budget_categories
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 7. MONTHLY_BUDGETS
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_monthly_budgets" ON monthly_budgets;
CREATE POLICY "users_own_monthly_budgets" ON monthly_budgets
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 8. SAVING_CATEGORIES
ALTER TABLE saving_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_saving_categories" ON saving_categories;
CREATE POLICY "users_own_saving_categories" ON saving_categories
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 9. SAVINGS
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_savings" ON savings;
CREATE POLICY "users_own_savings" ON savings
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 10. SAVING_MOVEMENTS
ALTER TABLE saving_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_saving_movements" ON saving_movements;
CREATE POLICY "users_own_saving_movements" ON saving_movements
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 11. FUTURE_EXPENSE_CATEGORIES
ALTER TABLE future_expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_future_expense_categories" ON future_expense_categories;
CREATE POLICY "users_own_future_expense_categories" ON future_expense_categories
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 12. FUTURE_EXPENSES
ALTER TABLE future_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_future_expenses" ON future_expenses;
CREATE POLICY "users_own_future_expenses" ON future_expenses
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 13. COMMITMENTS
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_commitments" ON commitments;
CREATE POLICY "users_own_commitments" ON commitments
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 14. COMMITMENT_PAYMENTS
ALTER TABLE commitment_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_commitment_payments" ON commitment_payments;
CREATE POLICY "users_own_commitment_payments" ON commitment_payments
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- NOTA: Las políticas para allowed_users y user_roles están definidas
-- en migration_auth.sql con el patrón correcto (email-based lookup).
-- NO definir políticas aquí para esas tablas para evitar conflictos.
