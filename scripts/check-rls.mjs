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
  // Try inserting into people (existing table) to confirm it works
  const { data: p, error: pErr } = await supabase.from('people').insert({ name: 'Test' }).select().single();
  if (pErr) {
    console.log('❌ people insert failed:', pErr.message);
  } else {
    console.log('✓ people insert OK - RLS no está bloqueando');
    // Clean up
    await supabase.from('people').delete().eq('id', p.id);
  }

  // Check if new tables exist by selecting
  const { error: tErr } = await supabase.from('budget_templates').select('id').limit(1);
  if (tErr) {
    console.log('❌ budget_templates no encontrada:', tErr.message);
  } else {
    console.log('✓ budget_templates existe');
  }

  // Try insert with explicit RLS bypass hint
  const { data, error } = await supabase.from('budget_templates').insert({
    name: 'Test Plantilla'
  }).select().single();
  if (error) {
    console.log('❌ budget_templates insert falló:', error.message);
    console.log('\nPosible solución: Desactivar RLS en las tablas nuevas.');
    console.log('Ejecuta en el SQL Editor de Supabase:');
    console.log('');
    console.log('alter table budget_templates disable row level security;');
    console.log('alter table budget_categories disable row level security;');
    console.log('alter table monthly_budgets disable row level security;');
  } else {
    console.log('✓ budget_templates insert OK:', data.name);
    await supabase.from('budget_templates').delete().eq('id', data.id);
  }
}

main().catch(console.error);
