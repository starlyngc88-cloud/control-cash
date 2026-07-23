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
  console.log('Migrando "Gastos Futuros" del modelo de presupuestos...\n');

  const { data: templates, error: tErr } = await supabase
    .from('budget_templates')
    .select('*')
    .ilike('name', '%gastos%futuros%');

  if (tErr) { console.error('Error buscando plantilla:', tErr.message); return; }
  if (!templates || templates.length === 0) {
    console.log('No se encontró ninguna plantilla llamada "Gastos Futuros".');
    console.log('Busca manualmente en /presupuestos y crea los gastos futuros a mano.');
    return;
  }

  for (const tmpl of templates) {
    console.log(`Plantilla encontrada: "${tmpl.name}" (${tmpl.id})`);

    const { data: categories, error: cErr } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('template_id', tmpl.id);

    if (cErr) { console.error('Error leyendo categorías:', cErr.message); continue; }
    if (!categories || categories.length === 0) {
      console.log('  Sin categorías, se omite.');
      continue;
    }

    for (const cat of categories) {
      const futuro = new Date();
      futuro.setMonth(futuro.getMonth() + 2);

      const { error: insErr } = await supabase.from('future_expenses').insert({
        title: cat.name,
        description: `Migrado de "${tmpl.name}"`,
        category: cat.name,
        expected_amount: cat.budgeted,
        expected_date: futuro.toISOString().split('T')[0],
        status: 'planned',
      });

      if (insErr) {
        console.error(`  ✗ Error al migrar "${cat.name}":`, insErr.message);
      } else {
        console.log(`  ✓ "${cat.name}" → future_expenses ($${cat.budgeted} — ${futuro.toISOString().split('T')[0]})`);
      }
    }
  }

  console.log('\n✅ Migración completada.');
  console.log('Revisa los datos en 🎯 Gastos Futuros y ajústalos si es necesario.');
}

main().catch(console.error);
