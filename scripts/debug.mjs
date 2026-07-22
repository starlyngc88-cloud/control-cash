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
  // 1. Check people
  const { data: people } = await supabase.from('people').select('*');
  console.log('=== PERSONAS ===');
  console.log(JSON.stringify(people, null, 2));

  // 2. Check expenses raw
  const { data: rawExpenses } = await supabase.from('expenses').select('*').limit(5);
  console.log('\n=== GASTOS CRUDOS (sin joins) ===');
  console.log(JSON.stringify(rawExpenses, null, 2));

  // 3. Check what getExpenses does - fetch people separately
  const personIds = [...new Set((rawExpenses ?? []).map(e => e.person_id))];
  console.log('\n=== Person IDs en gastos ===', personIds);
  
  if (personIds.length > 0) {
    const { data: foundPeople } = await supabase.from('people').select('id, name').in('id', personIds);
    console.log('\n=== Personas encontradas por ID ===');
    console.log(JSON.stringify(foundPeople, null, 2));

    const peopleMap = new Map((foundPeople ?? []).map(p => [p.id, p.name]));
    console.log('\n=== Mapeo ID -> Nombre ===');
    for (const exp of rawExpenses ?? []) {
      console.log(`  Expense ${exp.id.slice(0,8)}: person_id=${exp.person_id.slice(0,8)} -> name=${peopleMap.get(exp.person_id) ?? 'NO ENCONTRADO'}`);
    }
  }

  // 4. Check budget categories
  const catIds = [...new Set((rawExpenses ?? []).map(e => e.budget_category_id).filter(Boolean))];
  if (catIds.length > 0) {
    const { data: cats } = await supabase.from('budget_categories').select('*').in('id', catIds);
    console.log('\n=== Categorías encontradas ===');
    console.log(JSON.stringify(cats, null, 2));
  }

  // 5. Check people table for the person named "Kelly" or similar
  console.log('\n=== BUSCAR PERSONA POR NOMBRE ===');
  const { data: kelly } = await supabase.from('people').select('*').ilike('name', '%kelly%');
  console.log(JSON.stringify(kelly, null, 2));
}

main().catch(console.error);
