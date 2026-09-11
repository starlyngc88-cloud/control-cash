-- Cronograma de amortización para compromisos
create table amortization_schedules (
  id uuid default gen_random_uuid() primary key,
  commitment_id uuid not null references commitments(id) on delete cascade,
  payment_date date not null,
  cuota numeric(12,2) not null,
  capital numeric(12,2) not null,
  interest numeric(12,2) not null,
  fees numeric(12,2) default 0,
  remaining_balance numeric(12,2) not null,
  is_paid boolean default false,
  created_at timestamptz default now(),
  unique(commitment_id, payment_date)
);

-- RLS
ALTER TABLE amortization_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_amortization_schedules" ON amortization_schedules;
CREATE POLICY "users_own_amortization_schedules" ON amortization_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM commitments c
      WHERE c.id = amortization_schedules.commitment_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM allowed_users au
          JOIN user_roles ur ON ur.user_id = au.id
          WHERE au.email = (auth.jwt() ->> 'email')
          AND ur.role = 'admin'
        )
      )
    )
  );

-- Índices
CREATE INDEX idx_amortization_commitment ON amortization_schedules(commitment_id);
CREATE INDEX idx_amortization_date ON amortization_schedules(commitment_id, payment_date);
