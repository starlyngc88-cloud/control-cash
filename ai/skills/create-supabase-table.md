# Create Supabase Table Skill

Pasos para crear tabla:
1. Definir tipo en src/types/index.ts
2. Agregar CREATE TABLE en ai/sql-schema.sql
3. Crear funciones CRUD en src/lib/db.ts siguiendo patrón existente
4. Cada función: query → error check → return typed data
5. Para selects con joins: .select("*, relacion()")