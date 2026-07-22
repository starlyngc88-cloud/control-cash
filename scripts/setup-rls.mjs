import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

// Try to get DB password from env
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbPassword) {
  console.log('Necesito la contraseña de la BD para crear las políticas RLS.');
  console.log('Por favor ejecuta este SQL en el Supabase SQL Editor:');
  console.log('');
  console.log('-- Habilitar RLS y crear políticas para las nuevas tablas');
  console.log('alter table budget_templates enable row level security;');
  console.log('alter table budget_categories enable row level security;');
  console.log('alter table monthly_budgets enable row level security;');
  console.log('');
  console.log('create policy "Todos pueden ver plantillas" on budget_templates for select using (true);');
  console.log('create policy "Todos pueden insertar plantillas" on budget_templates for insert with check (true);');
  console.log('create policy "Todos pueden eliminar plantillas" on budget_templates for delete using (true);');
  console.log('');
  console.log('create policy "Todos pueden ver categorías" on budget_categories for select using (true);');
  console.log('create policy "Todos pueden insertar categorías" on budget_categories for insert with check (true);');
  console.log('create policy "Todos pueden eliminar categorías" on budget_categories for delete using (true);');
  console.log('');
  console.log('create policy "Todos pueden ver meses" on monthly_budgets for select using (true);');
  console.log('create policy "Todos pueden insertar meses" on monthly_budgets for insert with check (true);');
  console.log('create policy "Todos pueden eliminar meses" on monthly_budgets for delete using (true);');
  console.log('');
  console.log('-- También actualizar la política de expenses si ya existe');
  console.log('-- (normalmente expenses ya tiene políticas, solo requiere el nuevo campo)');
  console.log('drop policy if exists "Todos pueden ver gastos" on expenses;');
  console.log('create policy "Todos pueden ver gastos" on expenses for select using (true);');
  console.log('drop policy if exists "Todos pueden insertar gastos" on expenses;');
  console.log('create policy "Todos pueden insertar gastos" on expenses for insert with check (true);');
  console.log('drop policy if exists "Todos pueden eliminar gastos" on expenses;');
  console.log('create policy "Todos pueden eliminar gastos" on expenses for delete using (true);');
  process.exit(0);
}

const { default: pg } = await import('pg');
const host = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
const pool = new pg.Pool({
  host: `db.${host}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: dbPassword,
  ssl: { rejectUnauthorized: false },
});

const client = await pool.connect();

const sql = `
alter table budget_templates enable row level security;
alter table budget_categories enable row level security;
alter table monthly_budgets enable row level security;

create policy "Todos pueden ver plantillas" on budget_templates for select using (true);
create policy "Todos pueden insertar plantillas" on budget_templates for insert with check (true);
create policy "Todos pueden eliminar plantillas" on budget_templates for delete using (true);

create policy "Todos pueden ver categorías" on budget_categories for select using (true);
create policy "Todos pueden insertar categorías" on budget_categories for insert with check (true);
create policy "Todos pueden eliminar categorías" on budget_categories for delete using (true);

create policy "Todos pueden ver meses" on monthly_budgets for select using (true);
create policy "Todos pueden insertar meses" on monthly_budgets for insert with check (true);
create policy "Todos pueden eliminar meses" on monthly_budgets for delete using (true);

drop policy if exists "Todos pueden ver gastos" on expenses;
create policy "Todos pueden ver gastos" on expenses for select using (true);
drop policy if exists "Todos pueden insertar gastos" on expenses;
create policy "Todos pueden insertar gastos" on expenses for insert with check (true);
drop policy if exists "Todos pueden eliminar gastos" on expenses;
create policy "Todos pueden eliminar gastos" on expenses for delete using (true);
`;

try {
  await client.query(sql);
  console.log('✓ Políticas RLS creadas correctamente');
} catch (e) {
  console.error('Error:', e.message);
} finally {
  client.release();
  await pool.end();
}
