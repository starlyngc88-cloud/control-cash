import { supabase } from "./supabase"
import type { Person, Income, IncomeCategory, Expense, ExpenseCategory, BudgetTemplate, BudgetCategory, MonthlyBudget, Saving, SavingMovement, FutureExpense, FutureExpenseCategory, SavingCategory, Commitment, CommitmentPayment } from "@/types"
import { personSchema, incomeSchema, expenseSchema, expenseCategorySchema, budgetTemplateSchema, budgetCategorySchema, monthlyBudgetSchema, savingCategorySchema, savingSchema, savingMovementSchema, futureExpenseCategorySchema, futureExpenseSchema, commitmentSchema, commitmentPaymentSchema, incomeCategorySchema } from "./validation"
import { sanitizeInput } from "./sanitize"

/* ---- People ---- */

export async function getPeople() {
  const { data, error } = await supabase.from("people").select("*").order("name")
  if (error) throw error
  return data as Person[]
}

export async function createPerson(input: { name: string }) {
  const parsed = personSchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("people").insert(parsed).select().single()
  if (error) throw error
  return data as Person
}

export async function deletePerson(id: string) {
  const { error } = await supabase.from("people").delete().eq("id", id)
  if (error) throw error
}

export async function updatePerson(id: string, input: { name: string }) {
  const parsed = personSchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("people").update(parsed).eq("id", id)
  if (error) throw error
}

/* ---- Income ---- */

export async function getIncomes(options?: { person_id?: string; limit?: number; startDate?: string; endDate?: string }) {
  let query = supabase.from("income").select("*, income_categories(name)").order("date", { ascending: false }).order("created_at", { ascending: false })
  if (options?.person_id) query = query.eq("person_id", options.person_id)
  if (options?.startDate) query = query.gte("date", options.startDate)
  if (options?.endDate) query = query.lte("date", options.endDate)
  if (options?.limit) query = query.limit(options.limit)
  const { data, error } = await query
  if (error) throw error
  const raw = data as (Income & { income_categories: Pick<IncomeCategory, "name"> | null })[]
  const personIds = [...new Set(raw.map((inc) => inc.person_id))]
  const { data: people } = await supabase.from("people").select("id, name").in("id", personIds)
  const peopleMap = new Map((people ?? []).map((p) => [p.id, { name: p.name }]))
  return raw.map((inc) => ({ ...inc, people: peopleMap.get(inc.person_id) ?? null })) as (Income & { people: Pick<Person, "name"> | null; income_categories: Pick<IncomeCategory, "name"> | null })[]
}

export async function createIncome(input: { person_id: string; amount: number; description: string; date: string; category_id?: string | null }) {
  const parsed = incomeSchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("income").insert(parsed).select("*, income_categories(name)").single()
  if (error) throw error
  return data as Income & { income_categories: Pick<IncomeCategory, "name"> | null }
}

export async function deleteIncome(id: string) {
  const { error } = await supabase.from("income").delete().eq("id", id)
  if (error) throw error
}

export async function updateIncome(id: string, input: { person_id: string; amount: number; description: string; date: string; category_id?: string | null }) {
  const parsed = incomeSchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("income").update(parsed).eq("id", id)
  if (error) throw error
}

/* ---- Income Categories ---- */

export async function getIncomeCategories() {
  const { data, error } = await supabase.from("income_categories").select("*").order("name")
  if (error) throw error
  return data as IncomeCategory[]
}

export async function createIncomeCategory(input: { name: string }) {
  const parsed = incomeCategorySchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("income_categories").insert(parsed).select().single()
  if (error) throw error
  return data as IncomeCategory
}

export async function updateIncomeCategory(id: string, input: { name: string }) {
  const parsed = incomeCategorySchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("income_categories").update(parsed).eq("id", id)
  if (error) throw error
}

export async function deleteIncomeCategory(id: string) {
  await supabase.from("income").update({ category_id: null }).eq("category_id", id)
  const { error } = await supabase.from("income_categories").delete().eq("id", id)
  if (error) throw error
}

/* ---- Expense Categories ---- */

export async function getExpenseCategories() {
  const { data, error } = await supabase.from("expense_categories").select("*").order("name")
  if (error?.code === "PGRST205") return []
  if (error) throw error
  return data as ExpenseCategory[]
}

export async function createExpenseCategory(input: { name: string }) {
  const parsed = expenseCategorySchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("expense_categories").insert(parsed).select().single()
  if (error) throw error
  return data as ExpenseCategory
}

export async function updateExpenseCategory(id: string, input: { name: string }) {
  const parsed = expenseCategorySchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("expense_categories").update(parsed).eq("id", id)
  if (error) throw error
}

export async function deleteExpenseCategory(id: string) {
  await supabase.from("expenses").update({ expense_category_id: null }).eq("expense_category_id", id)
  const { error } = await supabase.from("expense_categories").delete().eq("id", id)
  if (error) throw error
}

/* ---- Expenses ---- */

export async function getExpenses(options?: { person_id?: string; limit?: number; startDate?: string; endDate?: string }) {
  let query = supabase.from("expenses").select("*").order("date", { ascending: false }).order("created_at", { ascending: false })
  if (options?.person_id) query = query.eq("person_id", options.person_id)
  if (options?.startDate) query = query.gte("date", options.startDate)
  if (options?.endDate) query = query.lte("date", options.endDate)
  if (options?.limit) query = query.limit(options.limit)
  const { data, error } = await query
  if (error) throw error
  const expenses = data as Expense[]
  const personIds = [...new Set(expenses.map((e) => e.person_id))]
  const expCatIds = [...new Set(expenses.map((e) => e.expense_category_id).filter(Boolean) as string[])]
  const [people, expCats] = await Promise.all([
    supabase.from("people").select("id, name").in("id", personIds),
    expCatIds.length > 0 ? supabase.from("expense_categories").select("id, name").in("id", expCatIds) : Promise.resolve({ data: [] }),
  ])
  const peopleMap = new Map((people?.data ?? []).map((p: { id: string; name: string }) => [p.id, { name: p.name }]))
  const expCatMap = new Map((expCats?.data ?? []).map((c: { id: string; name: string }) => [c.id, { id: c.id, name: c.name }]))
  const result = expenses.map((e) => ({
    ...e,
    people: peopleMap.get(e.person_id) ?? null,
    budget_categories: null,
    expense_categories: e.expense_category_id ? (expCatMap.get(e.expense_category_id) ?? null) : null,
  }))
  return result as (Expense & { people: Pick<Person, "name"> | null; budget_categories: null; expense_categories: Pick<ExpenseCategory, "id" | "name"> | null })[]
}

export async function createExpense(input: { person_id: string; amount: number; description: string; date: string; budget_category_id?: string | null; expense_category_id?: string | null }) {
  const parsed = expenseSchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("expenses").insert(parsed).select().single()
  if (error) throw error
  return data as Expense
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id)
  if (error) throw error
}

export async function updateExpense(id: string, input: { person_id: string; amount: number; description: string; date: string; budget_category_id?: string | null; expense_category_id?: string | null }) {
  const parsed = expenseSchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("expenses").update(parsed).eq("id", id)
  if (error) throw error
}

/* ---- Dashboard totals ---- */

export async function getDashboardData(months: string[]) {
  if (months.length === 0) return { totalIngresos: 0, totalGastos: 0, totalBudgeted: 0, balance: 0, recentIncomes: [], recentExpenses: [] }
  const sorted = [...months].sort()
  const startOfMonth = sorted[0] + "-01"
  const lastMonth = sorted[sorted.length - 1]
  const endOfMonth = new Date(parseInt(lastMonth.split("-")[0]), parseInt(lastMonth.split("-")[1]), 0).toISOString().split("T")[0]
  const [incomeResult, expenseResult, recentIncomes, recentExpenses, mbResult] = await Promise.all([
    supabase.from("income").select("amount").gte("date", startOfMonth).lte("date", endOfMonth),
    supabase.from("expenses").select("amount").gte("date", startOfMonth).lte("date", endOfMonth),
    getIncomes({ limit: 5, startDate: startOfMonth, endDate: endOfMonth }),
    getExpenses({ limit: 5, startDate: startOfMonth, endDate: endOfMonth }),
    supabase.from("monthly_budgets").select("id, template_id").eq("month", startOfMonth).maybeSingle(),
  ])
  const totalIngresos = incomeResult.data?.reduce((sum, i) => sum + Number(i.amount), 0) ?? 0
  const totalGastos = expenseResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0
  let totalBudgeted = 0
  try {
    if (mbResult.data) {
      const cats = await getMonthCategories(mbResult.data.id, mbResult.data.template_id)
      totalBudgeted = sumBudgetLeaves(cats)
    }
  } catch { totalBudgeted = 0 }
  return { totalIngresos, totalGastos, totalBudgeted, balance: totalIngresos - totalGastos, recentIncomes, recentExpenses }
}

export type YearlyMonth = { month: string; ingresos: number; gastos: number; presupuesto: number; balance: number }

export async function getYearlyData(year: number): Promise<YearlyMonth[]> {
  const months: YearlyMonth[] = []
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, "0")}`
    const startOfMonth = monthStr + "-01"
    const endOfMonth = new Date(year, m, 0).toISOString().split("T")[0]
    const [incomeResult, expenseResult] = await Promise.all([
      supabase.from("income").select("amount").gte("date", startOfMonth).lte("date", endOfMonth),
      supabase.from("expenses").select("amount").gte("date", startOfMonth).lte("date", endOfMonth),
    ])
    const ingresos = incomeResult.data?.reduce((s, i) => s + Number(i.amount), 0) ?? 0
    const gastos = expenseResult.data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
    const { data: mb } = await supabase.from("monthly_budgets").select("id, template_id").eq("month", startOfMonth).maybeSingle()
    let presupuesto = 0
    if (mb) {
      const cats = await getMonthCategories(mb.id, mb.template_id)
      presupuesto = sumBudgetLeaves(cats)
    }
    months.push({ month: monthStr, ingresos, gastos, presupuesto, balance: ingresos - gastos })
  }
  return months
}

/* ---- Budget Templates ---- */

export async function getBudgetTemplates() {
  try {
    const { data, error } = await supabase.from("budget_templates").select("*").order("created_at", { ascending: true })
    if (error) throw error
    return data as BudgetTemplate[]
  } catch { return [] }
}

export async function createBudgetTemplate(name: string) {
  const parsed = budgetTemplateSchema.parse({ name })
  const { data, error } = await supabase.from("budget_templates").insert(parsed).select().single()
  if (error) throw error
  return data as BudgetTemplate
}

export async function deleteBudgetTemplate(id: string) {
  const { error } = await supabase.from("budget_templates").delete().eq("id", id)
  if (error) throw error
}

export async function updateBudgetTemplate(id: string, input: { name: string }) {
  const parsed = budgetTemplateSchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("budget_templates").update(parsed).eq("id", id)
  if (error) throw error
}

/* ---- Budget Categories ---- */

export async function getBudgetCategories(templateId: string) {
  try {
    const { data, error } = await supabase.from("budget_categories").select("*").eq("template_id", templateId).order("name")
    if (error) throw error
    const cats = data as BudgetCategory[]
    const parents = cats.filter(c => !c.parent_id)
    const children = cats.filter(c => c.parent_id)
    return [...parents, ...children] as BudgetCategory[]
  } catch {
    try {
      const { data, error } = await supabase.from("budget_categories").select("id, name, template_id, budgeted, parent_id").eq("template_id", templateId).order("name")
      if (error) throw error
      return (data ?? []).map(c => ({ ...c, parent_id: c.parent_id ?? null })) as BudgetCategory[]
    } catch { return [] }
  }
}

function sumBudgetLeaves(cats: BudgetCategory[]): number {
  const parentIds = new Set(cats.filter(c => c.parent_id).map(c => c.parent_id))
  return cats.filter(c => !parentIds.has(c.id)).reduce((s, c) => s + Number(c.budgeted), 0)
}

async function getMonthCategories(monthlyBudgetId: string, templateId: string): Promise<BudgetCategory[]> {
  try {
    const { data, error } = await supabase.from("budget_categories").select("*").eq("monthly_budget_id", monthlyBudgetId).order("name")
    if (error) throw error
    const cats = (data ?? []).map((c: BudgetCategory) => ({ ...c, parent_id: c.parent_id ?? null }))
    if (cats.length > 0) return cats as BudgetCategory[]
  } catch {}
  return getBudgetCategories(templateId)
}

function formatMonthLabel(monthStr: string): string {
  const d = new Date(monthStr + "-01T00:00:00")
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

export async function getBudgetCategoriesForMonth(monthStr: string) {
  const startOfMonth = monthStr + "-01"
  const { data: mb } = await supabase.from("monthly_budgets").select("id, template_id").eq("month", startOfMonth).maybeSingle()
  if (mb) {
    const cats = await getMonthCategories(mb.id, mb.template_id)
    if (cats.length > 0) {
      const label = formatMonthLabel(monthStr)
      return cats.map(c => ({ ...c, budget_templates: { name: label } }))
    }
  }
  const templates = await getBudgetTemplates()
  const base = templates.find(t => t.name.toLowerCase() === "modelo base")
  if (base) {
    const cats = await getBudgetCategories(base.id)
    return cats.map(c => ({ ...c, budget_templates: { name: "Modelo base" } }))
  }
  return []
}

export async function getAllBudgetCategories() {
  try {
    const { data, error } = await supabase.from("budget_categories").select("*, budget_templates(name)").is("monthly_budget_id", null).order("name")
    if (error) throw error
    return data as (BudgetCategory & { budget_templates: Pick<BudgetTemplate, "name"> })[]
  } catch { return [] }
}

export async function createBudgetCategory(input: { template_id?: string; monthly_budget_id?: string; name: string; budgeted: number; parent_id?: string | null }) {
  const parsed = budgetCategorySchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("budget_categories").insert(parsed).select().single()
  if (error) throw error
  return data as BudgetCategory
}

export async function deleteBudgetCategory(id: string) {
  await supabase.from("expenses").update({ budget_category_id: null }).eq("budget_category_id", id)
  await supabase.from("commitments").update({ category_id: null }).eq("category_id", id)
  const { error } = await supabase.from("budget_categories").delete().eq("id", id)
  if (error) throw error
}

export async function updateBudgetCategory(id: string, input: { name: string; budgeted: number; parent_id?: string | null }) {
  const parsed = budgetCategorySchema.partial().parse(sanitizeInput(input))
  const { error } = await supabase.from("budget_categories").update(parsed).eq("id", id)
  if (error) throw error
}

/* ---- Monthly Budgets ---- */

export async function getMonthlyBudgets() {
  try {
    const { data, error } = await supabase.from("monthly_budgets").select("*, budget_templates(name)").order("month", { ascending: false })
    if (error) throw error
    const months = data as (MonthlyBudget & { budget_templates: Pick<BudgetTemplate, "name"> })[]
    const withTotals = await Promise.all(months.map(async (m) => {
      const cats = await getMonthCategories(m.id, m.template_id)
      return { ...m, totalBudgeted: sumBudgetLeaves(cats) }
    }))
    return withTotals as (MonthlyBudget & { budget_templates: Pick<BudgetTemplate, "name">; totalBudgeted: number })[]
  } catch { return [] }
}

export async function createMonthlyBudget(input: { template_id: string; month: string }) {
  const parsed = monthlyBudgetSchema.parse(input)
  const { data, error } = await supabase.from("monthly_budgets").insert(parsed).select().single()
  if (error) throw error
  const mb = data as MonthlyBudget
  const tplCats = await getBudgetCategories(parsed.template_id)
  const parents = tplCats.filter(c => !c.parent_id)
  const children = tplCats.filter(c => c.parent_id)
  const idMap = new Map<string, string>()
  for (const p of parents) {
    const { data: nc, error: ncError } = await supabase.from("budget_categories").insert({ monthly_budget_id: mb.id, name: p.name, budgeted: p.budgeted, parent_id: null }).select().single()
    if (ncError) throw ncError
    idMap.set(p.id, nc.id)
  }
  for (const ch of children) {
    const parentId = idMap.get(ch.parent_id!) ?? null
    const { error: chError } = await supabase.from("budget_categories").insert({ monthly_budget_id: mb.id, name: ch.name, budgeted: ch.budgeted, parent_id: parentId })
    if (chError) throw chError
  }
  const monthDate = new Date(mb.month + "T00:00:00")
  const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split("T")[0]
  const { data: monthExpenses } = await supabase.from("expenses").select("id, budget_category_id").gte("date", mb.month).lte("date", endOfMonth)
  for (const exp of monthExpenses ?? []) {
    const targetId = exp.budget_category_id ? idMap.get(exp.budget_category_id) : undefined
    if (targetId) await supabase.from("expenses").update({ budget_category_id: targetId }).eq("id", exp.id)
  }
  return mb
}

export async function deleteMonthlyBudget(id: string) {
  const { data: cats } = await supabase.from("budget_categories").select("id").eq("monthly_budget_id", id)
  const catIds = (cats ?? []).map(c => c.id)
  if (catIds.length > 0) {
    await supabase.from("expenses").update({ budget_category_id: null }).in("budget_category_id", catIds)
    await supabase.from("commitments").update({ category_id: null }).in("category_id", catIds)
  }
  const { error } = await supabase.from("monthly_budgets").delete().eq("id", id)
  if (error) throw error
}

/* ---- Monthly Budget Dashboard ---- */

export type CategoryStatus = "green" | "yellow" | "red"
export interface DashboardCategory { id: string; name: string; budgeted: number; spent: number; available: number; excess: number; percentage: number; status: CategoryStatus; parent_id: string | null }
export interface MonthlyBudgetDashboard { month: string; templateName: string; totalIngresos: number; totalBudgeted: number; totalGastos: number; balance: number; categories: DashboardCategory[] }
export type CategoryTreeNode = BudgetCategory & { children: CategoryTreeNode[] }

export function buildCategoryTree(categories: BudgetCategory[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>()
  const roots: CategoryTreeNode[] = []
  for (const cat of categories) { map.set(cat.id, { ...cat, children: [] }) }
  for (const cat of categories) {
    const node = map.get(cat.id)!
    if (cat.parent_id && map.has(cat.parent_id)) { map.get(cat.parent_id)!.children.push(node) }
    else { roots.push(node) }
  }
  return roots
}

/* ---- Saving Categories ---- */

export async function getSavingCategories() {
  const { data, error } = await supabase.from("saving_categories").select("*").order("name")
  if (error) throw error
  return data as SavingCategory[]
}

export async function createSavingCategory(input: { name: string }) {
  const parsed = savingCategorySchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("saving_categories").insert(parsed).select().single()
  if (error) throw error
  return data as SavingCategory
}

export async function updateSavingCategory(id: string, input: { name: string }) {
  const parsed = savingCategorySchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("saving_categories").update(parsed).eq("id", id)
  if (error) throw error
}

export async function deleteSavingCategory(id: string) {
  const { error } = await supabase.from("savings").delete().eq("category_id", id)
  if (error) throw error
  const { error: delErr } = await supabase.from("saving_categories").delete().eq("id", id)
  if (delErr) throw delErr
}

/* ---- Savings ---- */

export async function getSavings() {
  const { data, error } = await supabase.from("savings").select("*, saving_categories(name)").order("name")
  if (error) throw error
  return data as (Saving & { saving_categories: Pick<SavingCategory, "name"> | null })[]
}

export async function createSaving(input: { name: string; description: string; category_id?: string | null }) {
  const parsed = savingSchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("savings").insert(parsed).select("*, saving_categories(name)").single()
  if (error) throw error
  return data as Saving & { saving_categories: Pick<SavingCategory, "name"> | null }
}

export async function updateSaving(id: string, input: { name: string; description: string; category_id?: string | null }) {
  const parsed = savingSchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("savings").update(parsed).eq("id", id)
  if (error) throw error
}

export async function deleteSaving(id: string) {
  const { error } = await supabase.from("savings").delete().eq("id", id)
  if (error) throw error
}

/* ---- Saving Movements ---- */

export async function getSavingMovements(savingId: string) {
  const { data, error } = await supabase.from("saving_movements").select("*").eq("saving_id", savingId).order("movement_date", { ascending: false }).order("created_at", { ascending: false })
  if (error) throw error
  return data as SavingMovement[]
}

export async function createSavingMovement(input: { saving_id: string; type: "income" | "withdrawal"; amount: number; notes: string; movement_date: string }) {
  const parsed = savingMovementSchema.parse(sanitizeInput(input))
  const { data: mov, error: movError } = await supabase.from("saving_movements").insert(parsed).select().single()
  if (movError) throw movError
  const { data: saving } = await supabase.from("savings").select("current_amount").eq("id", parsed.saving_id).single()
  const amountChange = parsed.type === "income" ? parsed.amount : -parsed.amount
  const newAmount = Math.max(0, Number(saving?.current_amount ?? 0) + amountChange)
  const { error: updateError } = await supabase.from("savings").update({ current_amount: newAmount }).eq("id", parsed.saving_id)
  if (updateError) throw updateError
  return mov as SavingMovement
}

export async function getRecentSavingMovements(limit = 5) {
  const { data, error } = await supabase.from("saving_movements").select("*, savings(name)").order("movement_date", { ascending: false }).order("created_at", { ascending: false }).limit(limit)
  if (error) throw error
  return data as (SavingMovement & { savings: Pick<Saving, "name"> })[]
}

export async function getSavingsDashboard() {
  const [savingsResult, recentMovements] = await Promise.all([supabase.from("savings").select("current_amount"), getRecentSavingMovements(5)])
  const savings = savingsResult.data as Saving[] | null
  const totalAhorrado = savings?.reduce((sum, s) => sum + Number(s.current_amount), 0) ?? 0
  return { totalAhorrado, numHuchas: savings?.length ?? 0, recentMovements }
}

/* ---- Future Expense Categories ---- */

export async function getFutureExpenseCategories() {
  const { data, error } = await supabase.from("future_expense_categories").select("*").order("name")
  if (error) throw error
  return data as FutureExpenseCategory[]
}

export async function createFutureExpenseCategory(input: { name: string }) {
  const parsed = futureExpenseCategorySchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("future_expense_categories").insert(parsed).select().single()
  if (error) throw error
  return data as FutureExpenseCategory
}

export async function updateFutureExpenseCategory(id: string, input: { name: string }) {
  const parsed = futureExpenseCategorySchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("future_expense_categories").update(parsed).eq("id", id)
  if (error) throw error
}

export async function deleteFutureExpenseCategory(id: string) {
  await supabase.from("future_expenses").update({ category_id: null }).eq("category_id", id)
  const { error } = await supabase.from("future_expense_categories").delete().eq("id", id)
  if (error) throw error
}

/* ---- Future Expenses ---- */

export async function getFutureExpenses() {
  const { data, error } = await supabase.from("future_expenses").select("*, future_expense_categories(name)").order("expected_date", { ascending: true })
  if (error) throw error
  return data as (FutureExpense & { future_expense_categories: Pick<FutureExpenseCategory, "name"> | null })[]
}

export async function createFutureExpense(input: { title: string; description: string; category: string; category_id?: string | null; expected_amount: number; expected_date: string }) {
  const parsed = futureExpenseSchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("future_expenses").insert(parsed).select("*, future_expense_categories(name)").single()
  if (error) throw error
  return data as FutureExpense & { future_expense_categories: Pick<FutureExpenseCategory, "name"> | null }
}

export async function updateFutureExpense(id: string, input: { title: string; description: string; category: string; category_id?: string | null; expected_amount: number; expected_date: string }) {
  const parsed = futureExpenseSchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("future_expenses").update(parsed).eq("id", id)
  if (error) throw error
}

export async function deleteFutureExpense(id: string) {
  const { error } = await supabase.from("future_expenses").delete().eq("id", id)
  if (error) throw error
}

export async function updateFutureExpenseStatus(id: string, status: "planned" | "completed" | "cancelled") {
  const { error } = await supabase.from("future_expenses").update({ status }).eq("id", id)
  if (error) throw error
}

export async function getFutureExpensesDashboard() {
  const { data, error } = await supabase.from("future_expenses").select("*, future_expense_categories(name)").order("expected_date", { ascending: true })
  if (error) throw error
  const expenses = data as (FutureExpense & { future_expense_categories: Pick<FutureExpenseCategory, "name"> | null })[]
  const now = new Date()
  const planned = expenses.filter((e) => e.status === "planned")
  const next30 = planned.filter((e) => { const d = new Date(e.expected_date); const diff = d.getTime() - now.getTime(); return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000 })
  const next90 = planned.filter((e) => { const d = new Date(e.expected_date); const diff = d.getTime() - now.getTime(); return diff > 30 * 24 * 60 * 60 * 1000 && diff <= 90 * 24 * 60 * 60 * 1000 })
  return { expenses, next30, next90, totalPrevisto: planned.reduce((sum, e) => sum + Number(e.expected_amount), 0), numPendientes: planned.length }
}

/* ---- Monthly Budget Dashboard ---- */

export async function getMonthlyBudgetDashboard(id: string): Promise<MonthlyBudgetDashboard> {
  const { data: mb, error: mbError } = await supabase.from("monthly_budgets").select("*, budget_templates(name)").eq("id", id).single()
  if (mbError) throw mbError
  const categories = await getMonthCategories(mb.id, mb.template_id)
  const monthDate = new Date(mb.month + "T00:00:00")
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const startOfMonth = new Date(year, month, 1).toISOString().split("T")[0]
  const endOfMonth = new Date(year, month + 1, 0).toISOString().split("T")[0]
  const [expenseResult, incomeResult] = await Promise.all([
    supabase.from("expenses").select("amount, budget_category_id").gte("date", startOfMonth).lte("date", endOfMonth),
    supabase.from("income").select("amount").gte("date", startOfMonth).lte("date", endOfMonth),
  ])
  const expenses = expenseResult.data ?? []
  const incomes = incomeResult.data ?? []
  const categorySpent: Record<string, number> = {}
  for (const exp of expenses) { if (exp.budget_category_id) categorySpent[exp.budget_category_id] = (categorySpent[exp.budget_category_id] ?? 0) + Number(exp.amount) }
  type TreeNode = BudgetCategory & { children: TreeNode[] }
  const treeMap = new Map<string, TreeNode>()
  for (const cat of categories) { treeMap.set(cat.id, { ...cat, children: [] }) }
  const roots: TreeNode[] = []
  for (const cat of categories) {
    const node = treeMap.get(cat.id)!
    if (cat.parent_id && treeMap.has(cat.parent_id)) treeMap.get(cat.parent_id)!.children.push(node)
    else roots.push(node)
  }
  function nodeBudgeted(node: TreeNode): number {
    if (node.children.length === 0) return Number(node.budgeted)
    return node.children.reduce((s, c) => s + nodeBudgeted(c), 0)
  }
  function nodeSpent(node: TreeNode): number {
    if (node.children.length === 0) return categorySpent[node.id] ?? 0
    return node.children.reduce((s, c) => s + nodeSpent(c), 0)
  }
  function flattenTree(node: TreeNode): DashboardCategory[] {
    const budgeted = nodeBudgeted(node)
    const spent = nodeSpent(node)
    const available = Math.max(0, budgeted - spent)
    const excess = Math.max(0, spent - budgeted)
    const percentage = budgeted > 0 ? (spent / budgeted) * 100 : spent > 0 ? Infinity : 0
    let status: CategoryStatus = "green"
    if (percentage > 100) status = "red"
    else if (percentage >= 80) status = "yellow"
    const result: DashboardCategory = { id: node.id, name: node.name, budgeted, spent, available, excess, percentage, status, parent_id: node.parent_id ?? null }
    const children = node.children.flatMap((c: TreeNode) => flattenTree(c))
    return [result, ...children]
  }
  const categoryData = roots.flatMap((r: TreeNode) => flattenTree(r))
  const totalBudgeted = roots.reduce((s: number, r: TreeNode) => s + nodeBudgeted(r), 0)
  const totalGastos = roots.reduce((s: number, r: TreeNode) => s + nodeSpent(r), 0)
  const totalIngresos = incomes.reduce((s, i) => s + Number(i.amount), 0)
  return { month: mb.month, templateName: mb.budget_templates?.name ?? "", totalIngresos, totalBudgeted, totalGastos, balance: totalIngresos - totalGastos, categories: categoryData }
}

/* ---- Commitments ---- */

export async function getCommitments() {
  const { data, error } = await supabase.from("commitments").select("*, budget_categories(name)").order("name")
  if (error) throw error
  return data as (Commitment & { budget_categories: Pick<BudgetCategory, "name"> | null })[]
}

export async function createCommitment(input: { name: string; description: string; total_amount: number; current_balance: number; category_id?: string | null }) {
  const parsed = commitmentSchema.parse(sanitizeInput(input))
  const { data, error } = await supabase.from("commitments").insert(parsed).select("*, budget_categories(name)").single()
  if (error) throw error
  return data as Commitment & { budget_categories: Pick<BudgetCategory, "name"> | null }
}

export async function updateCommitment(id: string, input: { name: string; description: string; total_amount: number; current_balance: number; category_id?: string | null }) {
  const parsed = commitmentSchema.parse(sanitizeInput(input))
  const { error } = await supabase.from("commitments").update(parsed).eq("id", id)
  if (error) throw error
}

export async function deleteCommitment(id: string) {
  const { error } = await supabase.from("commitments").delete().eq("id", id)
  if (error) throw error
}

export async function getCommitmentPayments(commitmentId?: string) {
  let query = supabase.from("commitment_payments").select("*").order("date", { ascending: false }).order("created_at", { ascending: false })
  if (commitmentId) query = query.eq("commitment_id", commitmentId)
  const { data, error } = await query
  if (error) throw error
  return data as CommitmentPayment[]
}

export async function createCommitmentPayment(input: { commitment_id: string; amount: number; capital_amount: number; date: string; notes: string }) {
  const parsed = commitmentPaymentSchema.parse(sanitizeInput(input))
  const { data: pay, error: payError } = await supabase.from("commitment_payments").insert(parsed).select().single()
  if (payError) throw payError
  const { data: comm } = await supabase.from("commitments").select("current_balance").eq("id", parsed.commitment_id).single()
  const newBalance = Math.max(0, Number(comm?.current_balance ?? 0) - parsed.capital_amount)
  const { error: updateError } = await supabase.from("commitments").update({ current_balance: newBalance }).eq("id", parsed.commitment_id)
  if (updateError) throw updateError
  return pay as CommitmentPayment
}