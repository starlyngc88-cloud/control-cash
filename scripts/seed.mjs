import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Creando datos de prueba...\n');

  // 1. Crear plantilla
  const { data: template, error: tErr } = await supabase
    .from('budget_templates')
    .insert({ name: 'Plantilla Base' })
    .select()
    .single();
  if (tErr) { console.error('Error creando plantilla:', tErr.message); return; }
  console.log(`✓ Plantilla: ${template.name}`);

  // 2. Crear rubros
  const rubros = [
    { template_id: template.id, name: 'Mercado', budgeted: 450 },
    { template_id: template.id, name: 'Transporte', budgeted: 150 },
    { template_id: template.id, name: 'Ocio', budgeted: 200 },
    { template_id: template.id, name: 'Salud', budgeted: 100 },
    { template_id: template.id, name: 'Colegio', budgeted: 300 },
  ];
  const cats = [];
  for (const r of rubros) {
    const { data: c, error: cErr } = await supabase.from('budget_categories').insert(r).select().single();
    if (cErr) { console.error(`Error creando rubro ${r.name}:`, cErr.message); return; }
    cats.push(c);
    console.log(`  ✓ ${c.name}: $${c.budgeted}`);
  }

  // 3. Crear mes financiero (Julio 2026)
  const { data: mb, error: mbErr } = await supabase
    .from('monthly_budgets')
    .insert({ template_id: template.id, month: '2026-07-01' })
    .select()
    .single();
  if (mbErr) { console.error('Error creando mes:', mbErr.message); return; }
  console.log(`\n✓ Mes financiero: Julio 2026`);

  // 4. Obtener primera persona
  const { data: people } = await supabase.from('people').select('id, name').limit(1);
  if (!people || people.length === 0) {
    console.log('\n⚠️  No hay personas. Crea una en /personas y vuelve a ejecutar.');
    return;
  }
  const person = people[0];
  console.log(`\n✓ Persona: ${person.name}`);

  // 5. Crear gastos de ejemplo
  for (const cat of cats) {
    const amt = Math.round(cat.budgeted * (0.3 + Math.random() * 0.6) * 100) / 100;
    const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
    const { error: eErr } = await supabase.from('expenses').insert({
      person_id: person.id,
      amount: amt,
      description: `Gasto ejemplo - ${cat.name}`,
      date: `2026-07-${day}`,
      budget_category_id: cat.id,
    });
    if (!eErr) console.log(`  ✓ Gasto en ${cat.name}: $${amt}`);
  }

  console.log('\n✅ Datos de prueba creados.');
  console.log('\nAhora abre la app y navega a:');
  console.log('  • /presupuestos — para ver la plantilla y el mes');
  console.log('  • /presupuestos/' + mb.id + ' — para ver el dashboard');
  console.log('  • /gastos — para ver los gastos con rubros asignados');
}

main().catch(console.error);
