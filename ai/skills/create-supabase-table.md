# Create Supabase Table Skill

Pasos para crear tabla:
1. Definir tipo en src/types/index.ts
2. Agregar CREATE TABLE en ai/sql-schema.sql (incluir `user_id uuid default auth.uid() references auth.users(id)`)
3. Agregar Zod schema en src/lib/validation.ts
4. Crear funciones CRUD en src/lib/db.ts siguiendo patrón existente (usar Zod validation + sanitize)
5. Cada función: query → error check → return typed data
6. Para selects con joins: .select("*, relacion()")
7. Agregar RLS policy en sql/rls-policies.sql: `FOR ALL USING (user_id = auth.uid())`
8. Agregar migración en sql/rls-migration.sql: ALTER TABLE + ADD COLUMN user_id