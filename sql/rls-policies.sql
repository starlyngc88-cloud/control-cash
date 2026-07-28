-- Políticas RLS para KellyCash
-- Cada usuario solo puede ver/modificar sus propios datos
-- Requiere: columna user_id en cada tabla

-- 1. PEOPLE
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_people" ON people;
CREATE POLICY "users_own_people" ON people
  FOR ALL USING (user_id = auth.uid());

-- 2. INCOME_CATEGORIES
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_income_categories" ON income_categories;
CREATE POLICY "users_own_income_categories" ON income_categories
  FOR ALL USING (user_id = auth.uid());

-- 3. INCOME
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_income" ON income;
CREATE POLICY "users_own_income" ON income
  FOR ALL USING (user_id = auth.uid());

-- 4. EXPENSES
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_expenses" ON expenses;
CREATE POLICY "users_own_expenses" ON expenses
  FOR ALL USING (user_id = auth.uid());

-- 5. BUDGET_TEMPLATES
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_budget_templates" ON budget_templates;
CREATE POLICY "users_own_budget_templates" ON budget_templates
  FOR ALL USING (user_id = auth.uid());

-- 6. BUDGET_CATEGORIES
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_budget_categories" ON budget_categories;
CREATE POLICY "users_own_budget_categories" ON budget_categories
  FOR ALL USING (user_id = auth.uid());

-- 7. MONTHLY_BUDGETS
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_monthly_budgets" ON monthly_budgets;
CREATE POLICY "users_own_monthly_budgets" ON monthly_budgets
  FOR ALL USING (user_id = auth.uid());

-- 8. SAVING_CATEGORIES
ALTER TABLE saving_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_saving_categories" ON saving_categories;
CREATE POLICY "users_own_saving_categories" ON saving_categories
  FOR ALL USING (user_id = auth.uid());

-- 9. SAVINGS
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_savings" ON savings;
CREATE POLICY "users_own_savings" ON savings
  FOR ALL USING (user_id = auth.uid());

-- 10. SAVING_MOVEMENTS
ALTER TABLE saving_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_saving_movements" ON saving_movements;
CREATE POLICY "users_own_saving_movements" ON saving_movements
  FOR ALL USING (user_id = auth.uid());

-- 11. FUTURE_EXPENSE_CATEGORIES
ALTER TABLE future_expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_future_expense_categories" ON future_expense_categories;
CREATE POLICY "users_own_future_expense_categories" ON future_expense_categories
  FOR ALL USING (user_id = auth.uid());

-- 12. FUTURE_EXPENSES
ALTER TABLE future_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_future_expenses" ON future_expenses;
CREATE POLICY "users_own_future_expenses" ON future_expenses
  FOR ALL USING (user_id = auth.uid());

-- 13. COMMITMENTS
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_commitments" ON commitments;
CREATE POLICY "users_own_commitments" ON commitments
  FOR ALL USING (user_id = auth.uid());

-- 14. COMMITMENT_PAYMENTS
ALTER TABLE commitment_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_commitment_payments" ON commitment_payments;
CREATE POLICY "users_own_commitment_payments" ON commitment_payments
  FOR ALL USING (user_id = auth.uid());

-- 15. ALLOWED_USERS (admin-only management)
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_manage_allowed_users" ON allowed_users;
CREATE POLICY "admins_manage_allowed_users" ON allowed_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 16. USER_ROLES (admin-only management)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_manage_user_roles" ON user_roles;
CREATE POLICY "admins_manage_user_roles" ON user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );