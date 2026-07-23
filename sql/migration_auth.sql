-- ============================================================
-- Migration: Tablas de autenticación y autorización
-- ============================================================

-- 1. allowed_users: control de acceso por correo
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. user_roles: roles por usuario autorizado (referencia a allowed_users)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES allowed_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Insertar usuarios autorizados iniciales
INSERT INTO allowed_users (email, active)
VALUES
  ('starlyn.gonzalez@gmail.com', true),
  ('kellycor18@gmail.com', true)
ON CONFLICT (email) DO NOTHING;

-- 4. Insertar roles iniciales
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM allowed_users WHERE email = 'starlyn.gonzalez@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM allowed_users WHERE email = 'kellycor18@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_allowed_users_email ON allowed_users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- 6. Habilitar RLS
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para allowed_users
-- Cualquiera puede leer allowed_users (necesario para verificar registro)
CREATE POLICY "Cualquiera puede leer allowed_users"
  ON allowed_users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Solo admins pueden insertar/actualizar/eliminar allowed_users
CREATE POLICY "Admins pueden insertar allowed_users"
  ON allowed_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins pueden actualizar allowed_users"
  ON allowed_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins pueden eliminar allowed_users"
  ON allowed_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

-- 8. Políticas RLS para user_roles
-- Autenticados pueden leer (necesario para verificar rol)
CREATE POLICY "Autenticados pueden leer user_roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden gestionar roles
CREATE POLICY "Admins pueden insertar user_roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins pueden actualizar user_roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins pueden eliminar user_roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_users au
      JOIN user_roles ur ON ur.user_id = au.id
      WHERE au.email = (auth.jwt() ->> 'email')
      AND ur.role = 'admin'
    )
  );
