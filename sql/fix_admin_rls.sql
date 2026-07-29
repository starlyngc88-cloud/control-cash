-- ============================================================
-- Fix RLS para que admins puedan ver datos de todos los usuarios
-- ============================================================
-- Problema original:
--   Las políticas RLS usaban user_id = auth.uid() para aislar datos
--   por usuario. Pero kellycor18@gmail.com tiene un auth.uid()
--   diferente al del usuario que creó los datos (starlyn), así que
--   no veía ninguna información existente.
--
--   Además, user_roles.user_id referencia allowed_users.id (no
--   auth.users.id), por lo que cualquier policy que hiciera
--   user_roles.user_id = auth.uid() NUNCA funcionaba.
--
-- Fix:
--   Modifica todas las policies de datos para que permitan acceso
--   si user_id = auth.uid() (usuario regular viendo sus datos) O
--   si el usuario es admin (verificado por email del JWT).
--
--   El check de admin usa el mismo patrón de migration_auth.sql:
--     EXISTS (SELECT 1 FROM allowed_users au
--       JOIN user_roles ur ON ur.user_id = au.id
--       WHERE au.email = (auth.jwt() ->> 'email') AND ur.role = 'admin')
--
--   Elimina las policies rotas de allowed_users/user_roles para
--   que no pisoteen las correctas de migration_auth.sql.
-- ============================================================

-- Eliminar policies rotas de allowed_users y user_roles
-- (definidas originalmente en rls-policies.sql con user_id = auth.uid(),
--  lo cual NUNCA funciona porque user_roles.user_id = allowed_users.id,
--  NO auth.users.id)
-- Las policies correctas están en migration_auth.sql (email-based lookup).
drop policy if exists "admins_manage_allowed_users" on allowed_users;
drop policy if exists "admins_manage_user_roles" on user_roles;

-- PEOPLE
drop policy if exists "users_own_people" on people;
create policy "users_own_people" on people
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- INCOME_CATEGORIES
drop policy if exists "users_own_income_categories" on income_categories;
create policy "users_own_income_categories" on income_categories
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- INCOME
drop policy if exists "users_own_income" on income;
create policy "users_own_income" on income
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- EXPENSES
drop policy if exists "users_own_expenses" on expenses;
create policy "users_own_expenses" on expenses
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- BUDGET_TEMPLATES
drop policy if exists "users_own_budget_templates" on budget_templates;
create policy "users_own_budget_templates" on budget_templates
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- BUDGET_CATEGORIES
drop policy if exists "users_own_budget_categories" on budget_categories;
create policy "users_own_budget_categories" on budget_categories
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- MONTHLY_BUDGETS
drop policy if exists "users_own_monthly_budgets" on monthly_budgets;
create policy "users_own_monthly_budgets" on monthly_budgets
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- SAVING_CATEGORIES
drop policy if exists "users_own_saving_categories" on saving_categories;
create policy "users_own_saving_categories" on saving_categories
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- SAVINGS
drop policy if exists "users_own_savings" on savings;
create policy "users_own_savings" on savings
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- SAVING_MOVEMENTS
drop policy if exists "users_own_saving_movements" on saving_movements;
create policy "users_own_saving_movements" on saving_movements
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- FUTURE_EXPENSE_CATEGORIES
drop policy if exists "users_own_future_expense_categories" on future_expense_categories;
create policy "users_own_future_expense_categories" on future_expense_categories
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- FUTURE_EXPENSES
drop policy if exists "users_own_future_expenses" on future_expenses;
create policy "users_own_future_expenses" on future_expenses
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- COMMITMENTS
drop policy if exists "users_own_commitments" on commitments;
create policy "users_own_commitments" on commitments
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );

-- COMMITMENT_PAYMENTS
drop policy if exists "users_own_commitment_payments" on commitment_payments;
create policy "users_own_commitment_payments" on commitment_payments
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from allowed_users au
      join user_roles ur on ur.user_id = au.id
      where au.email = (auth.jwt() ->> 'email')
      and ur.role = 'admin'
    )
  );
