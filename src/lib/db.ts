import { supabase } from "./supabase"
import type { Person, Income, Expense, BudgetTemplate, BudgetCategory, MonthlyBudget } from "@/types"

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

  const incomes = data as Income[]
  const personIds = [...new Set(incomes.map((inc) => inc.person_id))]
  const { data: people } = await supabase
    .from("people")
    .select("id, name")
    .in("id", personIds)
  const peopleMap = new Map((people ?? []).map((p) => [p.id, { name: p.name }]))

  return incomes.map((inc) => ({
    ...inc,
    people: peopleMap.get(inc.person_id) ?? null,
  })) as (Income & { people: Pick<Person, "name"> | null })[]
}

export async function createIncome(income: {
  person_id: string
  amount: number
  description: string
  date: string
}) {
  const { data, error } = await supabase
    .from("income")
    .insert(income)
    .select()
    .single()
  if (error) throw error
  return data as Income
}

export async function deleteIncome(id: string) {
  const { error } = await supabase.from("income").delete().eq("id", id)
  if (error) throw error
}

export async function updateIncome(id: string, data: { person_id: string; amount: number; description: string; date: string }) {
  const { error } = await supabase.from("income").update(data).eq("id", id)
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
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

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
