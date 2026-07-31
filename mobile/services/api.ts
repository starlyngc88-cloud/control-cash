import { assertSupabaseConfigured, supabase } from "@/lib/supabase"
import type { Person, ExpenseCategory, IncomeCategory, DashboardData, YearlyMonth, BudgetTemplate, BudgetCategory, MonthlyBudget, FutureExpenseCategory, FutureExpense, Commitment, CommitmentPayment, AllowedUser } from "@/types/database"

const DEBUG_PREFIX = "[KellyCash][Mobile][Supabase]"
const DEBUG_LOGS = typeof __DEV__ !== "undefined" ? __DEV__ : true
let didLogAuthSnapshot = false

async function debugAuthState(scope: string) {
  if (didLogAuthSnapshot) return
  const { data, error } = await supabase.auth.getSession()
  const session = data.session
  if (error) {
    console.error(`${DEBUG_PREFIX} ${scope} auth.getSession failed`, error)
    return
  }
  if (DEBUG_LOGS) {
    console.log(`${DEBUG_PREFIX} ${scope} auth`, {
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
      expiresAt: session?.expires_at ?? null,
      hasAccessToken: Boolean(session?.access_token),
    })
  }
  didLogAuthSnapshot = true
}

function logReadResult(scope: string, error: unknown, rowCount?: number) {
  if (error) {
    console.error(`${DEBUG_PREFIX} ${scope} query failed`, error)
    return
  }
  if (DEBUG_LOGS) {
    console.log(`${DEBUG_PREFIX} ${scope} query ok`, { rowCount: rowCount ?? null })
  }
}

export async function getPeople(): Promise<Person[]> {
  const { data } = await supabase.from("people").select("*").order("name")
  return data ?? []
}
export async function createPerson(input: { name: string }) {
  return supabase.from("people").insert(input).select().single()
}
export async function updatePerson(id: string, input: { name: string }) {
  return supabase.from("people").update(input).eq("id", id)
}
export async function deletePerson(id: string) {
  return supabase.from("people").delete().eq("id", id)
}

export async function getExpenses(opts?: { startDate?: string; endDate?: string }): Promise<any[]> {
  assertSupabaseConfigured()
  await debugAuthState("getExpenses")
  if (DEBUG_LOGS) {
    console.log(`${DEBUG_PREFIX} getExpenses filters`, opts ?? {})
  }

  let query = supabase.from("expenses").select("*").order("date", { ascending: false })
  if (opts?.startDate) query = query.gte("date", opts.startDate)
  if (opts?.endDate) query = query.lte("date", opts.endDate)
  const { data, error } = await query
  logReadResult("getExpenses:expenses", error, data?.length)
  if (error || !data) return []

  const expenses = data as any[]
  const personIds = [...new Set(expenses.map((e: any) => e.person_id))]
  const expCatIds = [...new Set(expenses.map((e: any) => e.expense_category_id).filter(Boolean))]
  const budgetCatIds = [...new Set(expenses.map((e: any) => e.budget_category_id).filter(Boolean))]

  const [peopleRes, expCatsRes, bCatsRes] = await Promise.all([
    personIds.length > 0 ? supabase.from("people").select("id, name").in("id", personIds) : Promise.resolve({ data: [] }),
    expCatIds.length > 0 ? supabase.from("expense_categories").select("id, name").in("id", expCatIds) : { data: [] },
    budgetCatIds.length > 0 ? supabase.from("budget_categories").select("id, name").in("id", budgetCatIds) : { data: [] },
  ])
  logReadResult("getExpenses:people", "error" in peopleRes ? peopleRes.error : null, peopleRes.data?.length)
  logReadResult("getExpenses:expense_categories", "error" in expCatsRes ? expCatsRes.error : null, expCatsRes.data?.length)
  logReadResult("getExpenses:budget_categories", "error" in bCatsRes ? bCatsRes.error : null, bCatsRes.data?.length)

  const peopleMap = new Map((peopleRes.data ?? []).map((p: any) => [p.id, { name: p.name }]))
  const expCatMap = new Map((expCatsRes.data ?? []).map((c: any) => [c.id, { id: c.id, name: c.name }]))
  const bCatMap = new Map((bCatsRes.data ?? []).map((bc: any) => [bc.id, { name: bc.name }]))
  const mapped = expenses.map((e: any) => ({
    ...e,
    people: peopleMap.get(e.person_id) ?? null,
    expense_categories: e.expense_category_id ? expCatMap.get(e.expense_category_id) ?? null : null,
    budget_categories: e.budget_category_id ? bCatMap.get(e.budget_category_id) ?? null : null,
  }))
  logReadResult("getExpenses:mapped", null, mapped.length)
  return mapped
}
export async function createExpense(data: any) {
  return supabase.from("expenses").insert(data).select().single()
}
export async function updateExpense(id: string, data: any) {
  return supabase.from("expenses").update(data).eq("id", id)
}
export async function deleteExpense(id: string) {
  return supabase.from("expenses").delete().eq("id", id)
}

export async function getIncomes(opts?: { startDate?: string; endDate?: string }): Promise<any[]> {
  assertSupabaseConfigured()
  if (DEBUG_LOGS) {
    console.log(`${DEBUG_PREFIX} getIncomes filters`, opts ?? {})
  }
  let query = supabase.from("income").select("*, income_categories(name)").order("date", { ascending: false })
  if (opts?.startDate) query = query.gte("date", opts.startDate)
  if (opts?.endDate) query = query.lte("date", opts.endDate)
  const { data, error } = await query
  logReadResult("getIncomes:income", error, data?.length)
  if (error || !data) return []
  const raw = data as any[]
  const personIds = [...new Set(raw.map((inc: any) => inc.person_id))]
  const { data: people, error: peopleError } = personIds.length > 0
    ? await supabase.from("people").select("id, name").in("id", personIds)
    : { data: [], error: null }
  logReadResult("getIncomes:people", peopleError, people?.length)
  const peopleMap = new Map((people ?? []).map((p: any) => [p.id, { name: p.name }]))
  return raw.map((inc: any) => ({ ...inc, people: peopleMap.get(inc.person_id) ?? null }))
}
export async function createIncome(data: any) {
  return supabase.from("income").insert(data).select().single()
}
export async function updateIncome(id: string, data: any) {
  return supabase.from("income").update(data).eq("id", id)
}
export async function deleteIncome(id: string) {
  return supabase.from("income").delete().eq("id", id)
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await supabase.from("expense_categories").select("*").order("name")
  return data ?? []
}
export async function createExpenseCategory(input: { name: string }) {
  return supabase.from("expense_categories").insert(input).select().single()
}
export async function deleteExpenseCategory(id: string) {
  return supabase.from("expense_categories").delete().eq("id", id)
}

export async function getIncomeCategories(): Promise<IncomeCategory[]> {
  const { data } = await supabase.from("income_categories").select("*").order("name")
  return data ?? []
}
export async function createIncomeCategory(input: { name: string }) {
  return supabase.from("income_categories").insert(input).select().single()
}
export async function deleteIncomeCategory(id: string) {
  return supabase.from("income_categories").delete().eq("id", id)
}

export async function getDashboardData(months: string[]): Promise<DashboardData | null> {
  assertSupabaseConfigured()
  if (months.length === 0) return null
  const sorted = [...months].sort()
  const startDate = sorted[0] + "-01"
  const last = sorted[sorted.length - 1]
  const endDate = new Date(parseInt(last.split("-")[0]), parseInt(last.split("-")[1]), 0).toISOString().split("T")[0]
  if (DEBUG_LOGS) {
    console.log(`${DEBUG_PREFIX} getDashboardData range`, { months, startDate, endDate })
  }

  const [incomesData, expensesData, mbResult] = await Promise.all([
    getIncomes({ startDate, endDate }),
    getExpenses({ startDate, endDate }),
    supabase.from("monthly_budgets").select("id, template_id").eq("month", startDate).maybeSingle(),
  ])
  logReadResult("getDashboardData:monthly_budgets", mbResult.error)

  const totalIngresos = incomesData.reduce((s: number, i: any) => s + Number(i.amount), 0)
  const totalGastos = expensesData.reduce((s: number, e: any) => s + Number(e.amount), 0)
  let totalBudgeted = 0
  if (mbResult.data) {
    const cats = await getMonthlyBudgetCategories(mbResult.data.id, mbResult.data.template_id)
    totalBudgeted = sumBudgetLeaves(cats)
  }
  const balance = totalIngresos - totalGastos

  return { totalBudgeted, totalIngresos, totalGastos, balance, recentIncomes: incomesData.slice(0, 5), recentExpenses: expensesData.slice(0, 5) }
}

export async function getYearlyData(year: number): Promise<YearlyMonth[]> {
  assertSupabaseConfigured()
  const months: YearlyMonth[] = []
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, "0")}`
    const startDate = monthStr + "-01"
    const endDate = new Date(year, m, 0).toISOString().split("T")[0]
    const [incomesData, expensesData, mbResult] = await Promise.all([
      getIncomes({ startDate, endDate }),
      getExpenses({ startDate, endDate }),
      supabase.from("monthly_budgets").select("id, template_id").eq("month", startDate).maybeSingle(),
    ])
    const ingresos = incomesData.reduce((s: number, i: any) => s + Number(i.amount), 0)
    const gastos = expensesData.reduce((s: number, e: any) => s + Number(e.amount), 0)
    let presupuesto = 0
    if (mbResult.data) {
      const cats = await getMonthlyBudgetCategories(mbResult.data.id, mbResult.data.template_id)
      presupuesto = sumBudgetLeaves(cats)
    }
    months.push({ month: monthStr, ingresos, gastos, presupuesto, balance: ingresos - gastos })
  }
  return months
}

export async function getSavings() {
  const { data } = await supabase.from("savings").select("*, saving_categories(name)").order("name")
  return data ?? []
}
export async function createSaving(data: any) {
  return supabase.from("savings").insert(data).select().single()
}
export async function updateSaving(id: string, data: any) {
  return supabase.from("savings").update(data).eq("id", id)
}
export async function deleteSaving(id: string) {
  return supabase.from("savings").delete().eq("id", id)
}

export async function createSavingMovement(data: any) {
  return supabase.from("saving_movements").insert(data).select().single()
}
export async function getSavingMovements(savingId: string) {
  const { data } = await supabase.from("saving_movements").select("*").eq("saving_id", savingId).order("movement_date", { ascending: false })
  return data ?? []
}

export async function countAllSavingMovements(): Promise<number> {
  const { count } = await supabase.from("saving_movements").select("*", { count: "exact", head: true })
  return count ?? 0
}

export async function getSavingCategories() {
  const { data } = await supabase.from("saving_categories").select("*").order("name")
  return data ?? []
}

export async function getFutureExpenseCategories(): Promise<FutureExpenseCategory[]> {
  const { data } = await supabase.from("future_expense_categories").select("*").order("name")
  return data ?? []
}
export async function createFutureExpenseCategory(input: { name: string }) {
  return supabase.from("future_expense_categories").insert(input).select().single()
}
export async function deleteFutureExpenseCategory(id: string) {
  return supabase.from("future_expense_categories").delete().eq("id", id)
}

export async function getFutureExpenses(): Promise<any[]> {
  const { data } = await supabase.from("future_expenses").select("*, future_expense_categories(name)").order("expected_date")
  return data ?? []
}
export async function createFutureExpense(data: any) {
  return supabase.from("future_expenses").insert(data).select().single()
}
export async function updateFutureExpense(id: string, data: any) {
  return supabase.from("future_expenses").update(data).eq("id", id)
}
export async function deleteFutureExpense(id: string) {
  return supabase.from("future_expenses").delete().eq("id", id)
}
export async function updateFutureExpenseStatus(id: string, status: "planned" | "completed" | "cancelled") {
  return supabase.from("future_expenses").update({ status }).eq("id", id)
}

export async function getCommitments(): Promise<any[]> {
  const { data } = await supabase.from("commitments").select("*, budget_categories(name)").order("name")
  return data ?? []
}
export async function createCommitment(data: any) {
  return supabase.from("commitments").insert(data).select().single()
}
export async function updateCommitment(id: string, data: any) {
  return supabase.from("commitments").update(data).eq("id", id)
}
export async function deleteCommitment(id: string) {
  return supabase.from("commitments").delete().eq("id", id)
}

export async function getCommitmentPayments(commitmentId?: string): Promise<CommitmentPayment[]> {
  let query = supabase.from("commitment_payments").select("*").order("date", { ascending: false })
  if (commitmentId) query = query.eq("commitment_id", commitmentId)
  const { data } = await query
  return data ?? []
}
export async function createCommitmentPayment(data: any) {
  return supabase.from("commitment_payments").insert(data).select().single()
}

export async function getBudgetTemplates(): Promise<BudgetTemplate[]> {
  const { data } = await supabase.from("budget_templates").select("*").order("name")
  return data ?? []
}
export async function createBudgetTemplate(name: string) {
  return supabase.from("budget_templates").insert({ name }).select().single()
}
export async function deleteBudgetTemplate(id: string) {
  return supabase.from("budget_templates").delete().eq("id", id)
}

export async function getBudgetCategories(templateId: string): Promise<BudgetCategory[]> {
  const { data } = await supabase.from("budget_categories").select("*").eq("template_id", templateId).order("name")
  return data ?? []
}

function sumBudgetLeaves(cats: BudgetCategory[]): number {
  const parentIds = new Set(cats.filter((c: any) => c.parent_id).map((c: any) => c.parent_id))
  return cats.filter((c: any) => !parentIds.has(c.id)).reduce((s, c) => s + Number(c.budgeted), 0)
}

export async function getMonthlyBudgetCategories(monthlyBudgetId: string, templateId: string): Promise<BudgetCategory[]> {
  const { data, error } = await supabase.from("budget_categories").select("*").eq("monthly_budget_id", monthlyBudgetId).order("name")
  if (!error && data && data.length > 0) return (data ?? []).map((c: any) => ({ ...c, parent_id: c.parent_id ?? null })) as BudgetCategory[]
  return getBudgetCategories(templateId)
}

function monthLabel(monthStr: string): string {
  const d = new Date(monthStr + "-01T12:00:00")
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

export async function getBudgetCategoriesForMonth(monthStr: string): Promise<any[]> {
  const startDate = monthStr + "-01"
  const { data: mb } = await supabase.from("monthly_budgets").select("id, template_id").eq("month", startDate).maybeSingle()
  if (mb) {
    const cats = await getMonthlyBudgetCategories(mb.id, mb.template_id)
    if (cats.length > 0) {
      const label = monthLabel(monthStr)
      return cats.map((c: any) => ({ ...c, budget_templates: { name: label } }))
    }
  }
  const templates = await getBudgetTemplates()
  const base = templates.find((t: any) => t.name.toLowerCase() === "modelo base")
  if (base) {
    const cats = await getBudgetCategories(base.id)
    return cats.map((c: any) => ({ ...c, budget_templates: { name: "Modelo base" } }))
  }
  return []
}

export async function getAllBudgetCategories(): Promise<any[]> {
  const { data } = await supabase.from("budget_categories").select("*, budget_templates(name)").is("monthly_budget_id", null).order("name")
  return data ?? []
}
export async function createBudgetCategory(data: any) {
  return supabase.from("budget_categories").insert(data).select().single()
}
export async function updateBudgetCategory(id: string, data: any) {
  return supabase.from("budget_categories").update(data).eq("id", id)
}
export async function deleteBudgetCategory(id: string) {
  return supabase.from("budget_categories").delete().eq("id", id)
}

export async function getMonthlyBudgets(): Promise<any[]> {
  const { data } = await supabase.from("monthly_budgets").select("*, budget_templates(name)").order("month", { ascending: false })
  const months = data ?? []
  const withTotals = await Promise.all(months.map(async (m: any) => {
    const cats = await getMonthlyBudgetCategories(m.id, m.template_id)
    return { ...m, totalBudgeted: sumBudgetLeaves(cats) }
  }))
  return withTotals
}
export async function createMonthlyBudget(data: { template_id: string; month: string }) {
  const { data: mb, error } = await supabase.from("monthly_budgets").insert(data).select().single()
  if (error || !mb) return { data: null, error }
  const tplCats = await getBudgetCategories(data.template_id)
  const parents = tplCats.filter((c: any) => !c.parent_id)
  const children = tplCats.filter((c: any) => c.parent_id)
  const idMap = new Map<string, string>()
  for (const p of parents) {
    const { data: nc, error: ncError } = await supabase.from("budget_categories").insert({ monthly_budget_id: mb.id, name: p.name, budgeted: p.budgeted, parent_id: null }).select().single()
    if (ncError) return { data: mb, error: ncError }
    idMap.set(p.id, nc.id)
  }
  for (const ch of children) {
    const { error: chError } = await supabase.from("budget_categories").insert({ monthly_budget_id: mb.id, name: ch.name, budgeted: ch.budgeted, parent_id: idMap.get(ch.parent_id!) ?? null })
    if (chError) return { data: mb, error: chError }
  }
  const monthDate = new Date(mb.month + "T00:00:00")
  const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split("T")[0]
  const { data: monthExpenses } = await supabase.from("expenses").select("id, budget_category_id").gte("date", mb.month).lte("date", endOfMonth)
  for (const exp of (monthExpenses ?? []) as any[]) {
    const targetId = exp.budget_category_id ? idMap.get(exp.budget_category_id) : undefined
    if (targetId) await supabase.from("expenses").update({ budget_category_id: targetId }).eq("id", exp.id)
  }
  return { data: mb, error: null }
}
export async function deleteMonthlyBudget(id: string) {
  const { data: cats } = await supabase.from("budget_categories").select("id").eq("monthly_budget_id", id)
  const catIds = (cats ?? []).map((c: any) => c.id)
  if (catIds.length > 0) {
    await supabase.from("expenses").update({ budget_category_id: null }).in("budget_category_id", catIds)
    await supabase.from("commitments").update({ category_id: null }).in("category_id", catIds)
  }
  return supabase.from("monthly_budgets").delete().eq("id", id)
}

export async function getAllowedUsers(): Promise<AllowedUser[]> {
  const { data } = await supabase.from("allowed_users").select("*").order("created_at")
  return data ?? []
}
export async function createAllowedUser(input: { email: string; active: boolean }) {
  return supabase.from("allowed_users").insert(input).select().single()
}
export async function updateAllowedUser(id: string, input: { active: boolean }) {
  return supabase.from("allowed_users").update(input).eq("id", id)
}
export async function deleteAllowedUser(id: string) {
  return supabase.from("allowed_users").delete().eq("id", id)
}
export async function getUserRole(userId: string) {
  const { data } = await supabase.from("user_roles").select("*").eq("user_id", userId).maybeSingle()
  return data
}
export async function updateUserRole(userId: string, role: "admin" | "user") {
  const existing = await getUserRole(userId)
  if (existing) return supabase.from("user_roles").update({ role }).eq("user_id", userId)
  return supabase.from("user_roles").insert({ user_id: userId, role })
}

export function subscribeToTable(table: string, callback: (payload: any) => void) {
  return supabase.channel(`${table}-changes`).on("postgres_changes", { event: "*", schema: "public", table }, (payload) => callback(payload)).subscribe()
}
