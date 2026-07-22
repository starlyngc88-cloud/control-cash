import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read env
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('No se encontraron las variables de entorno en .env.local');
  process.exit(1);
}

console.log('Conectando a Supabase...');
console.log(`URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

// SQL Migration
const migrationSQL = `
create table if not exists budget_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists budget_categories (
  id uuid default gen_random_uuid() primary key,
  template_id uuid not null references budget_templates(id) on delete cascade,
  name text not null,
  budgeted numeric(12,2) not null check (budgeted >= 0)
);

create table if not exists monthly_budgets (
  id uuid default gen_random_uuid() primary key,
  template_id uuid not null references budget_templates(id),
  month date not null,
  created_at timestamptz default now(),
  unique(month)
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'expenses' and column_name = 'budget_category_id'
  ) then
    alter table expenses add column budget_category_id uuid references budget_categories(id);
  end if;
end $$;
`;

async function runMigration() {
  console.log('\n--- Ejecutando migración SQL ---\n');

  // Try via raw fetch to Supabase SQL endpoint
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({}),
    });
    console.log(`SQL endpoint check: ${response.status}`);
  } catch (e) {
    // expected
  }

  // Try direct INSERT into a table that doesn't exist yet to trigger creation
  // This won't work but let's see the error

  // The most reliable approach: try to use pg module with direct DB connection
  let migrated = false;

  // Try direct PostgreSQL connection
  try {
    const { default: pg } = await import('pg');
    // Try common Supabase connection patterns
    const host = `db.${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}.supabase.co`;
    
    console.log(`Intentando conectar a PostgreSQL: ${host}:5432`);

    // We need the password - ask for it or try common ones
    const dbPassword = process.env.SUPABASE_DB_PASSWORD;
    if (dbPassword) {
      const pool = new pg.Pool({
        host,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: dbPassword,
        ssl: { rejectUnauthorized: false },
      });
      const client = await pool.connect();
      console.log('Conectado a PostgreSQL!');
      await client.query(migrationSQL);
      console.log('Migración SQL ejecutada correctamente.');
      client.release();
      await pool.end();
      migrated = true;
    } else {
      console.log('SUPABASE_DB_PASSWORD no está definida en el entorno.');
    }
  } catch (e) {
    console.log(`Conexión PostgreSQL falló: ${e.message}`);
  }

  if (!migrated) {
    console.log('\n⚠️  No se pudo ejecutar la migración automáticamente.');
    console.log('   Debes ejecutar el SQL manualmente en el Supabase Dashboard.');
    console.log('   Abre: https://supabase.com/dashboard/project/dyvtsvmplnzlqkloqlfy/sql/new');
    console.log('   Y pega el contenido de sql/schema.sql');
    console.log('\n   O configura la variable SUPABASE_DB_PASSWORD con la contraseña de tu BD.');
    console.log('   La contraseña está en Settings → Database → Connection string en el dashboard.\n');
  }

  return migrated;
}

async function createTestData() {
  console.log('\n--- Creando datos de prueba ---\n');

  try {
    // 1. Create template
    const { data: template, error: tErr } = await supabase
      .from('budget_templates')
      .insert({ name: 'Plantilla Base' })
      .select()
      .single();
    
    if (tErr) throw tErr;
    console.log(`✓ Plantilla creada: ${template.name} (${template.id})`);

    // 2. Create categories
    const categories = [
      { template_id: template.id, name: 'Mercado', budgeted: 450 },
      { template_id: template.id, name: 'Transporte', budgeted: 150 },
      { template_id: template.id, name: 'Ocio', budgeted: 200 },
      { template_id: template.id, name: 'Salud', budgeted: 100 },
      { template_id: template.id, name: 'Colegio', budgeted: 300 },
    ];

    for (const cat of categories) {
      const { data: c, error: cErr } = await supabase
        .from('budget_categories')
        .insert(cat)
        .select()
        .single();
      if (cErr) throw cErr;
      console.log(`  ✓ Rubro: ${c.name} — $${c.budgeted}`);
    }

    // 3. Create monthly budget for current month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    
    const { data: mb, error: mbErr } = await supabase
      .from('monthly_budgets')
      .insert({ template_id: template.id, month })
      .select()
      .single();
    
    if (mbErr) throw mbErr;
    console.log(`\n✓ Mes financiero creado: ${month}`);

    // 4. Get a person to link expenses
    const { data: people } = await supabase.from('people').select('id').limit(1);
    if (people && people.length > 0) {
      const personId = people[0].id;
      
      // Get categories to assign expenses
      const { data: cats } = await supabase
        .from('budget_categories')
        .select('id, name, budgeted')
        .eq('template_id', template.id);

      if (cats) {
        for (const cat of cats) {
          const expenseAmount = Math.round(cat.budgeted * (0.3 + Math.random() * 0.5) * 100) / 100;
          const expenseDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
          const expenseDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${expenseDay}`;
          
          const { error: eErr } = await supabase
            .from('expenses')
            .insert({
              person_id: personId,
              amount: expenseAmount,
              description: `Gasto de prueba - ${cat.name}`,
              date: expenseDate,
              budget_category_id: cat.id,
            });
          
          if (eErr) throw eErr;
          console.log(`  ✓ Gasto en ${cat.name}: $${expenseAmount}`);
        }
      }
    } else {
      console.log('\n⚠️  No hay personas creadas. Los gastos de prueba no se asignarán.');
      console.log('   Crea una persona en /personas primero.');
    }

    console.log('\n✅ Datos de prueba creados exitosamente.');
    console.log('\nAhora puedes:');
    console.log('  1. Ir a /presupuestos y ver la plantilla con sus rubros');
    console.log('  2. Ir a /presupuestos/[id] para ver el dashboard del mes');
    console.log('  3. Ir a /gastos y ver los gastos con sus rubros asignados');
    
  } catch (e) {
    console.error(`\n❌ Error creando datos de prueba: ${e.message}`);
    if (e.message.includes('does not exist') || e.message.includes('relation') || e.message.includes('PGRST')) {
      console.log('\n⚠️  Las tablas no existen en Supabase. Ejecuta la migración SQL primero.');
      console.log('   Ve a https://supabase.com/dashboard/project/dyvtsvmplnzlqkloqlfy/sql/new');
      console.log('   Y pega el contenido de sql/schema.sql');
    }
    throw e;
  }
}

async function main() {
  const migrated = await runMigration();
  if (migrated) {
    await createTestData();
  } else {
    console.log('\n--- Saltando creación de datos de prueba (migración pendiente) ---');
    console.log('\nDespués de ejecutar el SQL manualmente, vuelve a correr:');
    console.log('  node scripts/setup-db.mjs');
  }
}

main().catch(console.error);
