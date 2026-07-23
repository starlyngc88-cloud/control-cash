import { supabase } from "./supabase"
import type { Person, Income, IncomeCategory, Expense, BudgetTemplate, BudgetCategory, MonthlyBudget, Saving, SavingMovement, FutureExpense, FutureExpenseCategory, SavingCategory, Commitment, CommitmentPayment } from "@/types"

/* ---- People ---- */

export async function getPeople() {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .order("name")
  if (error) throw error
  return data as Person[]
}

export async function createPerson(person: { name: string }) {
  const { data, error } = await supabase
    .from("people")
    .insert(person)
    .select()
    .single()
  if (error) throw error
  return data as Person
}

export async function deletePerson(id: string) {
  const { error } = await supabase.from("people").delete().eq("id", id)
  if (error) throw error
}

export async function updatePerson(id: string, data: { name: string }) {
  const { error } = await supabase.from("people").update(data).eq("id", id)
  if (error) throw error
}

/* ---- Income ---- */

export async function getIncomes(options?: { person_id?: string; limit?: number }) {
  let query = supabase
    .from("income")
    .select("*, income_categories(name)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (options?.person_id) {
    query = query.eq("person_id", options.person_id)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw error

  const raw = data as (Income & { income_categories: Pick<IncomeCategory, "name"> | null })[]
  const personIds = [...new Set(raw.map((inc) => inc.person_id))]
  const { data: people } = await supabase
    .from("people")
    .select("id, name")
    .in("id", personIds)
  const peopleMap = new Map((people ?? []).map((p) => [p.id, { name: p.name }]))

  return raw.map((inc) => ({
    ...inc,
    people: peopleMap.get(inc.person_id) ?? null,
  })) as (Income & { people: Pick<Person, "name"> | null; income_categories: Pick<IncomeCategory, "name"> | null })[]
}

export async function createIncome(income: {
  person_id: string
  amount: number
  description: string
  date: string
  category_id?: string | null
}) {
  const { data, error } = await supabase
    .from("income")
    .insert(income)
    .select("*, income_categories(name)")
    .single()
  if (error) throw error
  return data as Income & { income_categories: Pick<IncomeCategory, "name"> | null }
}

export async function deleteIncome(id: string) {
  const { error } = await supabase.from("income").delete().eq("id", id)
  if (error) throw error
}

export async function updateIncome(id: string, data: { person_id: string; amount: number; description: string; date: string; category_id?: string | null }) {
  const { error } = await supabase.from("income").update(data).eq("id", id)
  if (error) throw error
}

/* ---- Income Categories ---- */

export async function getIncomeCategories() {
  const { data, error } = await supabase
    .from("income_categories")
    .select("*")
    .order("name")
  if (error) throw error
  return data as IncomeCategory[]
}

export async function createIncomeCategory(cat: { name: string }) {
  const { data, error } = await supabase
    .from("income_categories")
    .insert(cat)
    .select()
    .single()
  if (error) throw error
  return data as IncomeCategory
}

export async function updateIncomeCategory(id: string, data: { name: string }) {
  const { error } = await supabase.from("income_categories").update(data).eq("id", id)
  if (error) throw error
}

export async function deleteIncomeCategory(id: string) {
  await supabase.from("income").update({ category_id: null }).eq("category_id", id)
  const { error } = await supabase.from("income_categories").delete().eq("id", id)
  if (error) throw error
}

/* ---- Expenses ---- */

export async function getExpenses(options?: { person_id?: string; limit?: number }) {
  let query = supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (options?.person_id) {
    query = query.eq("person_id", options.person_id)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw error

  const expenses = data as Expense[]

  // Get all person IDs
  const personIds = [...new Set(expenses.map((e) => e.person_id))]
  const { data: people } = await supabase
    .from("people")
    .select("id, name")
    .in("id", personIds)
  const peopleMap = new Map((people ?? []).map((p) => [p.id, { name: p.name }]))

  // Get all budget category IDs
  const catIds = [...new Set(expenses.map((e) => e.budget_category_id).filter(Boolean) as string[])]
  const { data: cats } = catIds.length > 0
    ? await supabase.from("budget_categories").select("id, name, template_id, budgeted").in("id", catIds)
    : { data: [] }
  const catMap = new Map((cats ?? []).map((c) => [c.id, { id: c.id, name: c.name, template_id: c.template_id, budgeted: c.budgeted }]))

  const result = expenses.map((e) => ({
    ...e,
    people: peopleMap.get(e.person_id) ?? null,
    budget_categories: e.budget_category_id ? (catMap.get(e.budget_category_id) ?? null) : null,
  }))

  return result as (Expense & { people: Pick<Person, "name"> | null; budget_categories: Pick<BudgetCategory, "id" | "name" | "template_id" | "budgeted"> | null })[]
}

export async function createExpense(expense: {
  person_id: string
  amount: number
  description: string
  date: string
  budget_category_id?: string | null
}) {
  const { data, error } = await supabase
    .from("expenses")
    .insert(expense)
    .select()
    .single()
  if (error) throw error
  return data as Expense
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id)
  if (error) throw error
}

export async function updateExpense(id: string, data: { person_id: string; amount: number; description: string; date: string; budget_category_id?: string | null }) {
  const { error } = await supabase.from("expenses").update(data).eq("id", id)
  if (error) throw error
}

/* ---- Dashboard totals ---- */

export async function getDashboardData(monthStr?: string) {
  const now = monthStr ? new Date(monthStr + "-01") : new Date()
  const startOfMonth = monthStr ? monthStr + "-01" : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const endOfMonth = monthStr
    ? new Date(parseInt(monthStr.split("-")[0]), parseInt(monthStr.split("-")[1]), 0).toISOString().split("T")[0]
    : new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const [incomeResult, expenseResult, recentIncomes, recentExpenses, mbResult] = await Promise.all([
    supabase
      .from("income")
      .select("amount")
      .gte("date", startOfMonth)
      .lte("date", endOfMonth),
    supabase
      .from("expenses")
      .select("amount")
      .gte("date", startOfMonth)
      .lte("date", endOfMonth),
    getIncomes({ limit: 5 }),
    getExpenses({ limit: 5 }),
    supabase
      .from("monthly_budgets")
      .select("template_id")
      .eq("month", startOfMonth)
      .maybeSingle(),
  ])

  const totalIngresos =
    incomeResult.data?.reduce((sum, i) => sum + Number(i.amount), 0) ?? 0
  const totalGastos =
    expenseResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0

  let totalBudgeted = 0
  try {
    if (mbResult.data) {
      const { data: cats } = await supabase
        .from("budget_categories")
        .select("id, budgeted, parent_id")
        .eq("template_id", mbResult.data.template_id)
      if (cats && cats.length > 0) {
        const parentIds = new Set(cats.filter(c => c.parent_id).map(c => c.parent_id))
        totalBudgeted = cats
          .filter(c => !parentIds.has(c.id))
          .reduce((s, c) => s + Number(c.budgeted), 0)
      }
    }
  } catch {
    totalBudgeted = 0
  }

  return {
    totalIngresos,
    totalGastos,
    totalBudgeted,
    balance: totalIngresos - totalGastos,
    recentIncomes,
    recentExpenses,
  }
}

/* ---- Budget Templates ---- */

export async function getBudgetTemplates() {
  try {
    const { data, error } = await supabase
      .from("budget_templates")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return data as BudgetTemplate[]
  } catch {
    return []
  }
}

export async function createBudgetTemplate(name: string) {
  const { data, error } = await supabase
    .from("budget_templates")
    .insert({ name })
    .select()
    .single()
  if (error) throw error
  return data as BudgetTemplate
}

export async function deleteBudgetTemplate(id: string) {
  const { error } = await supabase.from("budget_templates").delete().eq("id", id)
  if (error) throw error
}

export async function updateBudgetTemplate(id: string, data: { name: string }) {
  const { error } = await supabase.from("budget_templates").update(data).eq("id", id)
  if (error) throw error
}

/* ---- Budget Categories ---- */

export async function getBudgetCategories(templateId: string) {
  try {
    const { data, error } = await supabase
      .from("budget_categories")
      .select("*")
      .eq("template_id", templateId)
      .order("name")
    if (error) throw error
    const cats = data as any[]
    const parents = cats.filter(c => !c.parent_id)
    const children = cats.filter(c => c.parent_id)
    return [...parents, ...children] as BudgetCategory[]
  } catch {
    try {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("id, name, template_id, budgeted, parent_id")
        .eq("template_id", templateId)
        .order("name")
      if (error) {
        const { data: d2, error: e2 } = await supabase
          .from("budget_categories")
          .select("id, name, template_id, budgeted")
          .eq("template_id", templateId)
          .order("name")
        if (e2) return []
        return (d2 ?? []).map(c => ({ ...c, parent_id: null })) as BudgetCategory[]
      }
      return (data ?? []).map(c => ({ ...c, parent_id: c.parent_id ?? null })) as BudgetCategory[]
    } catch {
      return []
    }
  }
}

export async function getAllBudgetCategories() {
  try {
    const { data, error } = await supabase
      .from("budget_categories")
      .select("*, budget_templates(name)")
      .order("name")
    if (error) throw error
    return data as (BudgetCategory & { budget_templates: Pick<BudgetTemplate, "name"> })[]
  } catch {
    return []
  }
}

export async function createBudgetCategory(category: {
  template_id: string
  name: string
  budgeted: number
  parent_id?: string | null
}) {
  const { data, error } = await supabase
    .from("budget_categories")
    .insert(category)
    .select()
    .single()
  if (error) throw error
  return data as BudgetCategory
}

export async function deleteBudgetCategory(id: string) {
  await supabase.from("expenses").update({ budget_category_id: null }).eq("budget_category_id", id)
  await supabase.from("commitments").update({ category_id: null }).eq("category_id", id)
  const { error } = await supabase.from("budget_categories").delete().eq("id", id)
  if (error) throw error
}

export async function updateBudgetCategory(id: string, data: { name: string; budgeted: number; parent_id?: string | null }) {
  const { error } = await supabase.from("budget_categories").update(data).eq("id", id)
  if (error) throw error
}

/* ---- Monthly Budgets ---- */

export async function getMonthlyBudgets() {
  try {
    const { data, error } = await supabase
      .from("monthly_budgets")
      .select("*, budget_templates(name)")
      .order("month", { ascending: false })
    if (error) throw error
    return data as (MonthlyBudget & { budget_templates: Pick<BudgetTemplate, "name"> })[]
  } catch {
    return []
  }
}

export async function createMonthlyBudget(monthlyBudget: {
  template_id: string
  month: string
}) {
  const { data, error } = await supabase
    .from("monthly_budgets")
    .insert(monthlyBudget)
    .select()
    .single()
  if (error) throw error
  return data as MonthlyBudget
}

export async function deleteMonthlyBudget(id: string) {
  const { error } = await supabase.from("monthly_budgets").delete().eq("id", id)
  if (error) throw error
}

/* ---- Monthly Budget Dashboard ---- */

export type CategoryStatus = "green" | "yellow" | "red"

export interface DashboardCategory {
  id: string
  name: string
  budgeted: number
  spent: number
  available: number
  excess: number
  percentage: number
  status: CategoryStatus
  parent_id: string | null
}

export interface MonthlyBudgetDashboard {
  month: string
  templateName: string
  totalIngresos: number
  totalBudgeted: number
  totalGastos: number
  balance: number
  categories: DashboardCategory[]
}

export type CategoryTreeNode = BudgetCategory & { children: CategoryTreeNode[] }

export function buildCategoryTree(categories: BudgetCategory[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>()
  const roots: CategoryTreeNode[] = []

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/* ---- Saving Categories ---- */

export async function getSavingCategories() {
  const { data, error } = await supabase
    .from("saving_categories")
    .select("*")
    .order("name")
  if (error) throw error
  return data as SavingCategory[]
}

export async function createSavingCategory(cat: { name: string }) {
  const { data, error } = await supabase
    .from("saving_categories")
    .insert(cat)
    .select()
    .single()
  if (error) throw error
  return data as SavingCategory
}

export async function updateSavingCategory(id: string, data: { name: string }) {
  const { error } = await supabase
    .from("saving_categories")
    .update(data)
    .eq("id", id)
  if (error) throw error
}

export async function deleteSavingCategory(id: string) {
  const { error } = await supabase
    .from("savings")
    .delete()
    .eq("category_id", id)
  if (error) throw error
  const { error: delErr } = await supabase
    .from("saving_categories")
    .delete()
    .eq("id", id)
  if (delErr) throw delErr
}

/* ---- Savings ---- */

export async function getSavings() {
  const { data, error } = await supabase
    .from("savings")
    .select("*, saving_categories(name)")
    .order("name")
  if (error) throw error
  return data as (Saving & { saving_categories: Pick<SavingCategory, "name"> | null })[]
}

export async function createSaving(saving: { name: string; description: string; category_id?: string | null }) {
  const { data, error } = await supabase
    .from("savings")
    .insert(saving)
    .select("*, saving_categories(name)")
    .single()
  if (error) throw error
  return data as Saving & { saving_categories: Pick<SavingCategory, "name"> | null }
}

export async function updateSaving(id: string, data: { name: string; description: string; category_id?: string | null }) {
  const { error } = await supabase
    .from("savings")
    .update(data)
    .eq("id", id)
  if (error) throw error
}

export async function deleteSaving(id: string) {
  const { error } = await supabase
    .from("savings")
    .delete()
    .eq("id", id)
  if (error) throw error
}

/* ---- Saving Movements ---- */

export async function getSavingMovements(savingId: string) {
  const { data, error } = await supabase
    .from("saving_movements")
    .select("*")
    .eq("saving_id", savingId)
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as SavingMovement[]
}

export async function createSavingMovement(movement: {
  saving_id: string
  type: "income" | "withdrawal"
  amount: number
  notes: string
  movement_date: string
}) {
  const { data: mov, error: movError } = await supabase
    .from("saving_movements")
    .insert(movement)
    .select()
    .single()
  if (movError) throw movError

  const { data: saving } = await supabase
    .from("savings")
    .select("current_amount")
    .eq("id", movement.saving_id)
    .single()

  const amountChange = movement.type === "income" ? movement.amount : -movement.amount
  const newAmount = Math.max(0, Number(saving?.current_amount ?? 0) + amountChange)

  const { error: updateError } = await supabase
    .from("savings")
    .update({ current_amount: newAmount })
    .eq("id", movement.saving_id)
  if (updateError) throw updateError

  return mov as SavingMovement
}

export async function getRecentSavingMovements(limit = 5) {
  const { data, error } = await supabase
    .from("saving_movements")
    .select("*, savings(name)")
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as (SavingMovement & { savings: Pick<Saving, "name"> })[]
}

export async function getSavingsDashboard() {
  const [savingsResult, recentMovements] = await Promise.all([
    supabase.from("savings").select("current_amount"),
    getRecentSavingMovements(5),
  ])

  const savings = savingsResult.data as Saving[] | null
  const totalAhorrado = savings?.reduce((sum, s) => sum + Number(s.current_amount), 0) ?? 0
  const numHuchas = savings?.length ?? 0

  return {
    totalAhorrado,
    numHuchas,
    recentMovements,
  }
}

/* ---- Future Expense Categories ---- */

export async function getFutureExpenseCategories() {
  const { data, error } = await supabase
    .from("future_expense_categories")
    .select("*")
    .order("name")
  if (error) throw error
  return data as FutureExpenseCategory[]
}

export async function createFutureExpenseCategory(cat: { name: string }) {
  const { data, error } = await supabase
    .from("future_expense_categories")
    .insert(cat)
    .select()
    .single()
  if (error) throw error
  return data as FutureExpenseCategory
}

export async function updateFutureExpenseCategory(id: string, data: { name: string }) {
  const { error } = await supabase
    .from("future_expense_categories")
    .update(data)
    .eq("id", id)
  if (error) throw error
}

export async function deleteFutureExpenseCategory(id: string) {
  const { error } = await supabase
    .from("future_expenses")
    .update({ category_id: null })
    .eq("category_id", id)
  if (error) throw error
  const { error: delErr } = await supabase
    .from("future_expense_categories")
    .delete()
    .eq("id", id)
  if (delErr) throw delErr
}

/* ---- Future Expenses ---- */

export async function getFutureExpenses() {
  const { data, error } = await supabase
    .from("future_expenses")
    .select("*, future_expense_categories(name)")
    .order("expected_date", { ascending: true })
  if (error) throw error
  return data as (FutureExpense & { future_expense_categories: Pick<FutureExpenseCategory, "name"> | null })[]
}

export async function createFutureExpense(fe: {
  title: string
  description: string
  category: string
  category_id?: string | null
  expected_amount: number
  expected_date: string
}) {
  const { data, error } = await supabase
    .from("future_expenses")
    .insert(fe)
    .select("*, future_expense_categories(name)")
    .single()
  if (error) throw error
  return data as FutureExpense & { future_expense_categories: Pick<FutureExpenseCategory, "name"> | null }
}

export async function updateFutureExpense(id: string, data: {
  title: string
  description: string
  category: string
  category_id?: string | null
  expected_amount: number
  expected_date: string
}) {
  const { error } = await supabase
    .from("future_expenses")
    .update(data)
    .eq("id", id)
  if (error) throw error
}

export async function deleteFutureExpense(id: string) {
  const { error } = await supabase
    .from("future_expenses")
    .delete()
    .eq("id", id)
  if (error) throw error
}

export async function updateFutureExpenseStatus(id: string, status: "planned" | "completed" | "cancelled") {
  const { error } = await supabase
    .from("future_expenses")
    .update({ status })
    .eq("id", id)
  if (error) throw error
}

export async function getFutureExpensesDashboard() {
  const { data, error } = await supabase
    .from("future_expenses")
    .select("*, future_expense_categories(name)")
    .order("expected_date", { ascending: true })
  if (error) throw error

  const expenses = data as (FutureExpense & { future_expense_categories: Pick<FutureExpenseCategory, "name"> | null })[]
  const now = new Date()
  const planned = expenses.filter((e) => e.status === "planned")

  const next30 = planned.filter((e) => {
    const d = new Date(e.expected_date)
    const diff = d.getTime() - now.getTime()
    return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000
  })

  const next90 = planned.filter((e) => {
    const d = new Date(e.expected_date)
    const diff = d.getTime() - now.getTime()
    return diff > 30 * 24 * 60 * 60 * 1000 && diff <= 90 * 24 * 60 * 60 * 1000
  })

  const totalPrevisto = planned.reduce((sum, e) => sum + Number(e.expected_amount), 0)
  const numPendientes = planned.length

  return { expenses, next30, next90, totalPrevisto, numPendientes }
}

/* ---- Monthly Budget Dashboard ---- */

export async function getMonthlyBudgetDashboard(id: string): Promise<MonthlyBudgetDashboard> {
  const { data: mb, error: mbError } = await supabase
    .from("monthly_budgets")
    .select("*, budget_templates(name)")
    .eq("id", id)
    .single()
  if (mbError) throw mbError

  let categories: any[]
  try {
    const { data, error } = await supabase
      .from("budget_categories")
      .select("*, parent_id")
      .eq("template_id", mb.template_id)
      .order("name")
    if (error) throw error
    categories = (data ?? []).map((c: any) => ({ ...c, parent_id: c.parent_id ?? null }))
  } catch {
    const { data, error } = await supabase
      .from("budget_categories")
      .select("id, name, template_id, budgeted")
      .eq("template_id", mb.template_id)
      .order("name")
    if (error) throw error
    categories = (data ?? []).map((c: any) => ({ ...c, parent_id: null }))
  }

  const monthDate = new Date(mb.month + "T00:00:00")
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const startOfMonth = new Date(year, month, 1).toISOString().split("T")[0]
  const endOfMonth = new Date(year, month + 1, 0).toISOString().split("T")[0]

  const [expenseResult, incomeResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("amount, budget_category_id")
      .gte("date", startOfMonth)
      .lte("date", endOfMonth),
    supabase
      .from("income")
      .select("amount")
      .gte("date", startOfMonth)
      .lte("date", endOfMonth),
  ])

  const expenses = expenseResult.data ?? []
  const incomes = incomeResult.data ?? []

  const categorySpent: Record<string, number> = {}
  for (const exp of expenses) {
    if (exp.budget_category_id) {
      categorySpent[exp.budget_category_id] = (categorySpent[exp.budget_category_id] ?? 0) + Number(exp.amount)
    }
  }

  // Build tree
  const treeMap = new Map<string, BudgetCategory & { children: (BudgetCategory & { children: any[] })[] }>()
  for (const cat of categories) {
    treeMap.set(cat.id, { ...cat, children: [] })
  }
  const roots: (BudgetCategory & { children: any[] })[] = []
  for (const cat of categories) {
    const node = treeMap.get(cat.id)!
    if (cat.parent_id && treeMap.has(cat.parent_id)) {
      treeMap.get(cat.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  function nodeBudgeted(node: { budgeted: number, children: any[] }): number {
    if (node.children.length === 0) return Number(node.budgeted)
    return node.children.reduce((s: number, c: any) => s + nodeBudgeted(c), 0)
  }

  function nodeSpent(node: { id: string, children: any[] }): number {
    if (node.children.length === 0) return categorySpent[node.id] ?? 0
    return node.children.reduce((s: number, c: any) => s + nodeSpent(c), 0)
  }

  function flattenTree(node: any): DashboardCategory[] {
    const budgeted = nodeBudgeted(node)
    const spent = nodeSpent(node)
    const available = Math.max(0, budgeted - spent)
    const excess = Math.max(0, spent - budgeted)
    const percentage = budgeted > 0 ? (spent / budgeted) * 100 : spent > 0 ? Infinity : 0

    let status: CategoryStatus = "green"
    if (percentage > 100) status = "red"
    else if (percentage >= 80) status = "yellow"

    const result: DashboardCategory = {
      id: node.id, name: node.name, budgeted, spent,
      available, excess, percentage, status, parent_id: node.parent_id ?? null,
    }

    const children = node.children.flatMap(flattenTree)
    return [result, ...children]
  }

  const categoryData = roots.flatMap(flattenTree)

  const totalBudgeted = roots.reduce((s, r) => s + nodeBudgeted(r), 0)
  const totalGastos = roots.reduce((s, r) => s + nodeSpent(r), 0)
  const totalIngresos = incomes.reduce((s, i) => s + Number(i.amount), 0)

  return {
    month: mb.month,
    templateName: mb.budget_templates?.name ?? "",
    totalIngresos,
    totalBudgeted,
    totalGastos,
    balance: totalIngresos - totalGastos,
    categories: categoryData,
  }
}

/* ---- Commitments ---- */

export async function getCommitments() {
  const { data, error } = await supabase
    .from("commitments")
    .select("*, budget_categories(name)")
    .order("name")
  if (error) throw error
  return data as (Commitment & { budget_categories: Pick<BudgetCategory, "name"> | null })[]
}

export async function createCommitment(comm: { name: string; description: string; total_amount: number; current_balance: number; category_id?: string | null }) {
  const { data, error } = await supabase
    .from("commitments")
    .insert(comm)
    .select("*, budget_categories(name)")
    .single()
  if (error) throw error
  return data as Commitment & { budget_categories: Pick<BudgetCategory, "name"> | null }
}

export async function updateCommitment(id: string, data: { name: string; description: string; total_amount: number; current_balance: number; category_id?: string | null }) {
  const { error } = await supabase
    .from("commitments")
    .update(data)
    .eq("id", id)
  if (error) throw error
}

export async function deleteCommitment(id: string) {
  const { error } = await supabase
    .from("commitments")
    .delete()
    .eq("id", id)
  if (error) throw error
}

export async function getCommitmentPayments(commitmentId?: string) {
  let query = supabase
    .from("commitment_payments")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
  if (commitmentId) {
    query = query.eq("commitment_id", commitmentId)
  }
  const { data, error } = await query
  if (error) throw error
  return data as CommitmentPayment[]
}

export async function createCommitmentPayment(payment: { commitment_id: string; amount: number; capital_amount: number; date: string; notes: string }) {
  const { data: pay, error: payError } = await supabase
    .from("commitment_payments")
    .insert(payment)
    .select()
    .single()
  if (payError) throw payError

  const { data: comm } = await supabase
    .from("commitments")
    .select("current_balance")
    .eq("id", payment.commitment_id)
    .single()

  const newBalance = Math.max(0, Number(comm?.current_balance ?? 0) - payment.capital_amount)
  const { error: updateError } = await supabase
    .from("commitments")
    .update({ current_balance: newBalance })
    .eq("id", payment.commitment_id)
  if (updateError) throw updateError

  return pay as CommitmentPayment
}
