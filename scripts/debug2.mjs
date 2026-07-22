import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

// Simula exactamente lo que hace getExpenses
async function getExpenses() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) throw error

  const expenses = data

  const personIds = [...new Set(expenses.map((e) => e.person_id))]
  const { data: people } = await supabase
    .from("people")
    .select("id, name")
    .in("id", personIds)
  const peopleMap = new Map((people ?? []).map((p) => [p.id, { name: p.name }]))

  const catIds = [...new Set(expenses.map((e) => e.budget_category_id).filter(Boolean))]
  const { data: cats } = catIds.length > 0
    ? await supabase.from("budget_categories").select("id, name, template_id, budgeted").in("id", catIds)
    : { data: [] }
  const catMap = new Map((cats ?? []).map((c) => [c.id, { id: c.id, name: c.name, template_id: c.template_id, budgeted: c.budgeted }]))

  const result = expenses.map((e) => ({
    ...e,
    people: peopleMap.get(e.person_id) ?? null,
    budget_categories: e.budget_category_id ? (catMap.get(e.budget_category_id) ?? null) : null,
  }))

  return result
}

async function main() {
  const result = await getExpenses();
  console.log('=== RESULTADO DE getExpenses ===');
  for (const r of result) {
    console.log(`\nGasto: ${r.description}`);
    console.log(`  person_id: ${r.person_id}`);
    console.log(`  people: ${JSON.stringify(r.people)}`);
    console.log(`  people?.name: ${r.people?.name}`);
    console.log(`  budget_category_id: ${r.budget_category_id}`);
    console.log(`  budget_categories: ${JSON.stringify(r.budget_categories)}`);
  }
}

main().catch(console.error);
