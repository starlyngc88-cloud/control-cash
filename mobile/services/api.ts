import { assertSupabaseConfigured, supabase } from "@/lib/supabase"
import type { Person, ExpenseCategory, IncomeCategory, DashboardData, YearlyMonth, BudgetTemplate, BudgetCategory, MonthlyBudget, FutureExpenseCategory, FutureExpense, Commitment, CommitmentPayment, AllowedUser, Expense, Income, Saving, SavingMovement, SavingCategory, CashflowGranularity, CashflowPoint, CategoryCashflowItem, ExpenseCategoryTab, SavingsDashboard } from "@/types/database"

const DEBUG_PREFIX = "[KellyCash][Mobile][Supabase]"
const DEBUG_LOGS = typeof __DEV__ !== "undefined" ? __DEV__ : true
let didLogAuthSnapshot = false

export type ExpenseWithRelations = Expense & {
  people: Pick<Person, "name"> | null
  expense_categories: Pick<ExpenseCategory, "id" | "name"> | null
  budget_categories: Pick<BudgetCategory, "name"> | null
  savings: Pick<Saving, "id" | "name"> | null
}

export type IncomeWithRelations = Income & {
  people: Pick<Person, "name"> | null
  income_categories: Pick<IncomeCategory, "name"> | null
}

export type FutureExpenseWithRelations = FutureExpense & {
  future_expense_categories: Pick<FutureExpenseCategory, "name"> | null
  savings: Pick<Saving, "id" | "name" | "current_amount"> | null
}

export type CommitmentWithRelations = Commitment & {
  budget_categories: Pick<BudgetCategory, "name"> | null
}

export type SavingWithRelations = Saving & {
  saving_categories: Pick<SavingCategory, "name"> | null
}

export type BudgetCategoryWithTemplate = BudgetCategory & {
  budget_templates: Pick<BudgetTemplate, "name">
}

export type MonthlyBudgetWithTotals = MonthlyBudget & {
  budget_templates: Pick<BudgetTemplate, "name">
  totalBudgeted: number
  totalSpent: number
  hasMovements: boolean
}

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

export async function getExpenses(opts?: { startDate?: string; endDate?: string }): Promise<ExpenseWithRelations[]> {
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

  const expenses = data as unknown as Expense[]
  const personIds = [...new Set(expenses.map((e: Expense) => e.person_id))]
  const expCatIds = [...new Set(expenses.map((e: Expense) => e.expense_category_id).filter(Boolean))]
  const budgetCatIds = [...new Set(expenses.map((e: Expense) => e.budget_category_id).filter(Boolean))]
  const savingIds = [...new Set(expenses.map((e: Expense) => e.saving_id).filter(Boolean))]

  const [peopleRes, expCatsRes, bCatsRes, savingsRes] = await Promise.all([
    personIds.length > 0 ? supabase.from("people").select("id, name").in("id", personIds) : Promise.resolve({ data: [] }),
    expCatIds.length > 0 ? supabase.from("expense_categories").select("id, name").in("id", expCatIds) : { data: [] },
    budgetCatIds.length > 0 ? supabase.from("budget_categories").select("id, name").in("id", budgetCatIds) : { data: [] },
    savingIds.length > 0 ? supabase.from("savings").select("id, name").in("id", savingIds) : { data: [] },
  ])
  logReadResult("getExpenses:people", "error" in peopleRes ? peopleRes.error : null, peopleRes.data?.length)
  logReadResult("getExpenses:expense_categories", "error" in expCatsRes ? expCatsRes.error : null, expCatsRes.data?.length)
  logReadResult("getExpenses:budget_categories", "error" in bCatsRes ? bCatsRes.error : null, bCatsRes.data?.length)
  logReadResult("getExpenses:savings", "error" in savingsRes ? savingsRes.error : null, savingsRes.data?.length)

  const peopleMap = new Map((peopleRes.data ?? []).map((p: Pick<Person, "id" | "name">) => [p.id, { name: p.name }]))
  const expCatMap = new Map((expCatsRes.data ?? []).map((c: Pick<ExpenseCategory, "id" | "name">) => [c.id, { id: c.id, name: c.name }]))
  const bCatMap = new Map((bCatsRes.data ?? []).map((bc: Pick<BudgetCategory, "id" | "name">) => [bc.id, { name: bc.name }]))
  const savingMap = new Map((savingsRes.data ?? []).map((s: Pick<Saving, "id" | "name">) => [s.id, { id: s.id, name: s.name }]))
  const mapped: ExpenseWithRelations[] = expenses.map((e: Expense) => ({
    ...e,
    people: peopleMap.get(e.person_id) ?? null,
    expense_categories: e.expense_category_id ? expCatMap.get(e.expense_category_id) ?? null : null,
    budget_categories: e.budget_category_id ? bCatMap.get(e.budget_category_id) ?? null : null,
    savings: e.saving_id ? savingMap.get(e.saving_id) ?? null : null,
  }))
  logReadResult("getExpenses:mapped", null, mapped.length)
  return mapped
}
async function recalcSavingBalance(savingId: string) {
  const { data, error } = await supabase.from("saving_movements").select("type, amount").eq("saving_id", savingId)
  if (error) throw error
  const balance = (data ?? []).reduce((sum: number, m: { type: string; amount: number | null }) => sum + (m.type === "income" ? Number(m.amount) : -Number(m.amount)), 0)
  const { error: updateError } = await supabase.from("savings").update({ current_amount: Math.max(0, balance) }).eq("id", savingId)
  if (updateError) throw updateError
}
async function findOrCreateExpenseCategory(name: string): Promise<string | null> {
  if (!name) return null
  const { data: existing } = await supabase
    .from("expense_categories")
    .select("id")
    .ilike("name", name)
    .eq("tab", "categoria")
    .maybeSingle()
  if (existing) return existing.id
  const { data: created } = await supabase
    .from("expense_categories")
    .insert({ name, tab: "categoria" })
    .select("id")
    .single()
  return created?.id ?? null
}

export async function createExpense(data: Partial<Expense>) {
  if (data.expense_category_id && !data.saving_id) {
    const { data: cat } = await supabase
      .from("expense_categories")
      .select("tab")
      .eq("id", data.expense_category_id)
      .maybeSingle()
    if (cat?.tab === "hucha") {
      throw new Error("Los gastos de hucha deben tener una hucha vinculada")
    }
  }
  if (data.budget_category_id && !data.expense_category_id) {
    const { data: budgetCat } = await supabase
      .from("budget_categories")
      .select("name")
      .eq("id", data.budget_category_id)
      .maybeSingle()
    if (budgetCat) {
      const expCatId = await findOrCreateExpenseCategory(budgetCat.name)
      if (expCatId) data.expense_category_id = expCatId
    }
  }
  const { data: exp, error } = await supabase.from("expenses").insert(data).select().single()
  if (error) throw error
  if (data.saving_id) {
    await createSavingMovement({
      saving_id: data.saving_id,
      type: "withdrawal",
      amount: Number(data.amount ?? 0),
      notes: data.description ?? "",
      movement_date: data.date ?? new Date().toISOString().split("T")[0],
      expense_id: (exp as Expense).id,
    })
  }
  return exp
}
export async function updateExpense(id: string, data: Partial<Expense>) {
  if (data.expense_category_id && !data.saving_id) {
    const { data: cat } = await supabase
      .from("expense_categories")
      .select("tab")
      .eq("id", data.expense_category_id)
      .maybeSingle()
    if (cat?.tab === "hucha") {
      throw new Error("Los gastos de hucha deben tener una hucha vinculada")
    }
  }
  if (data.budget_category_id && !data.expense_category_id) {
    const { data: budgetCat } = await supabase
      .from("budget_categories")
      .select("name")
      .eq("id", data.budget_category_id)
      .maybeSingle()
    if (budgetCat) {
      const expCatId = await findOrCreateExpenseCategory(budgetCat.name)
      if (expCatId) data.expense_category_id = expCatId
    }
  }
  const { data: prev } = await supabase.from("expenses").select("saving_id, amount").eq("id", id).single()
  const { error } = await supabase.from("expenses").update(data).eq("id", id)
  if (error) throw error
  const prevSaving = prev?.saving_id ?? null
  const newSaving = data.saving_id ?? null
  const prevAmount = Number(prev?.amount ?? 0)
  if (prevSaving) {
    await createSavingMovement({
      saving_id: prevSaving,
      type: "income",
      amount: prevAmount,
      notes: "Ajuste de gasto",
      movement_date: new Date().toISOString().split("T")[0],
    })
  }
  if (newSaving) {
    await createSavingMovement({
      saving_id: newSaving,
      type: "withdrawal",
      amount: Number(data.amount ?? 0),
      notes: data.description ?? "",
      movement_date: data.date ?? new Date().toISOString().split("T")[0],
    })
  }
}
export async function deleteExpense(id: string) {
  const { data: prev } = await supabase.from("expenses").select("saving_id, amount, description").eq("id", id).single()
  const { data: linked } = await supabase.from("saving_movements").select("saving_id").eq("expense_id", id)
  const { error } = await supabase.from("expenses").delete().eq("id", id)
  if (error) throw error
  if (linked && linked.length > 0) {
    for (const m of linked) {
      await supabase.from("saving_movements").delete().eq("expense_id", id)
      await recalcSavingBalance(m.saving_id)
    }
  } else if (prev?.saving_id) {
    await createSavingMovement({
      saving_id: prev.saving_id,
      type: "income",
      amount: Number(prev.amount),
      notes: `Reversión de gasto ${prev.description ?? ""}`.trim(),
      movement_date: new Date().toISOString().split("T")[0],
    })
  }
}

export async function getIncomes(opts?: { startDate?: string; endDate?: string }): Promise<IncomeWithRelations[]> {
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
  const raw = data as unknown as (Income & { income_categories: Pick<IncomeCategory, "name"> | null })[]
  const personIds = [...new Set(raw.map((inc: Income) => inc.person_id))]
  const { data: people, error: peopleError } = personIds.length > 0
    ? await supabase.from("people").select("id, name").in("id", personIds)
    : { data: [], error: null }
  logReadResult("getIncomes:people", peopleError, people?.length)
  const peopleMap = new Map((people ?? []).map((p: Pick<Person, "id" | "name">) => [p.id, { name: p.name }]))
  return raw.map((inc: Income & { income_categories: Pick<IncomeCategory, "name"> | null }): IncomeWithRelations => ({ ...inc, people: peopleMap.get(inc.person_id) ?? null }))
}
export async function createIncome(data: Partial<Income>) {
  return supabase.from("income").insert(data).select().single()
}
export async function updateIncome(id: string, data: Partial<Income>) {
  return supabase.from("income").update(data).eq("id", id)
}
export async function deleteIncome(id: string) {
  return supabase.from("income").delete().eq("id", id)
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await supabase.from("expense_categories").select("*").order("name")
  return data ?? []
}
export async function createExpenseCategory(input: { name: string; tab?: ExpenseCategoryTab | null }) {
  return supabase.from("expense_categories").insert(input).select().single()
}
export async function updateExpenseCategory(id: string, input: { name: string; tab?: ExpenseCategoryTab | null }) {
  return supabase.from("expense_categories").update(input).eq("id", id)
}
export async function deleteExpenseCategory(id: string) {
  await supabase.from("expenses").update({ expense_category_id: null }).eq("expense_category_id", id)
  return supabase.from("expense_categories").delete().eq("id", id)
}

export async function getIncomeCategories(): Promise<IncomeCategory[]> {
  const { data } = await supabase.from("income_categories").select("*").order("name")
  return data ?? []
}
export async function createIncomeCategory(input: { name: string }) {
  return supabase.from("income_categories").insert(input).select().single()
}
export async function updateIncomeCategory(id: string, input: { name: string }) {
  return supabase.from("income_categories").update(input).eq("id", id)
}
export async function deleteIncomeCategory(id: string) {
  await supabase.from("income").update({ category_id: null }).eq("category_id", id)
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

  const totalIngresos = incomesData.reduce((s: number, i: IncomeWithRelations) => s + Number(i.amount), 0)
  const gastosDisponibles = expensesData.filter((e: ExpenseWithRelations) => !e.saving_id)
  const totalGastos = gastosDisponibles.reduce((s: number, e: ExpenseWithRelations) => s + Number(e.amount), 0)
  const totalGastosConRubro = gastosDisponibles.filter((e: ExpenseWithRelations) => e.budget_category_id).reduce((s: number, e: ExpenseWithRelations) => s + Number(e.amount), 0)
  const totalGastosSinRubro = totalGastos - totalGastosConRubro
  let totalBudgeted = 0
  if (mbResult.data) {
    const cats = await getMonthlyBudgetCategories(mbResult.data.id, mbResult.data.template_id)
    totalBudgeted = sumBudgetLeaves(cats)
  }
  const balance = totalIngresos - totalGastos

  return { totalBudgeted, totalIngresos, totalGastos, totalGastosConRubro, totalGastosSinRubro, balance, recentIncomes: incomesData.slice(0, 5), recentExpenses: expensesData.slice(0, 5) }
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
    const ingresos = incomesData.reduce((s: number, i: IncomeWithRelations) => s + Number(i.amount), 0)
    const gastos = expensesData.filter((e: ExpenseWithRelations) => !e.saving_id).reduce((s: number, e: ExpenseWithRelations) => s + Number(e.amount), 0)
    let presupuesto = 0
    if (mbResult.data) {
      const cats = await getMonthlyBudgetCategories(mbResult.data.id, mbResult.data.template_id)
      presupuesto = sumBudgetLeaves(cats)
    }
    months.push({ month: monthStr, ingresos, gastos, presupuesto, balance: ingresos - gastos })
  }
  return months
}

/* ---- Cashflow & category charts ---- */

const pad = (n: number) => String(n).padStart(2, "0")
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function autoGranularity(startDate: string, endDate: string): CashflowGranularity {
  const start = new Date(startDate + "T00:00:00").getTime()
  const end = new Date(endDate + "T00:00:00").getTime()
  if (!startDate || !endDate || Number.isNaN(start) || Number.isNaN(end)) return "day"
  const days = Math.round((end - start) / 86400000)
  if (days <= 45) return "day"
  if (days <= 183) return "week"
  if (days <= 450) return "month"
  return "year"
}

const GRANULARITY_LABEL: Record<CashflowGranularity, string> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
  year: "Año",
}

export function granularityLabel(g: CashflowGranularity): string {
  return GRANULARITY_LABEL[g]
}

function bucketKey(date: string, granularity: CashflowGranularity): string {
  const d = new Date(date + "T00:00:00")
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  if (granularity === "year") return String(y)
  if (granularity === "month") return `${y}-${m}`
  if (granularity === "week") {
    const dow = (d.getDay() + 6) % 7
    const start = new Date(d)
    start.setDate(d.getDate() - dow)
    return toYmd(start)
  }
  return date
}

function labelFor(key: string, granularity: CashflowGranularity): string {
  if (granularity === "year") return key
  if (granularity === "month") {
    return new Date(key + "-01T00:00:00").toLocaleDateString("es-CO", { month: "short", year: "numeric" }).replace(".", "")
  }
  return new Date(key + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "")
}

function nextBucket(cursor: Date, granularity: CashflowGranularity): Date {
  const next = new Date(cursor)
  if (granularity === "day") next.setDate(next.getDate() + 1)
  else if (granularity === "week") next.setDate(next.getDate() + 7)
  else if (granularity === "month") next.setMonth(next.getMonth() + 1)
  else next.setFullYear(next.getFullYear() + 1)
  return next
}

export async function getCashflowData(startDate: string, endDate: string, granularity: CashflowGranularity): Promise<CashflowPoint[]> {
  assertSupabaseConfigured()
  const [incomeRes, expenseRes] = await Promise.all([
    supabase.from("income").select("date, amount").gte("date", startDate).lte("date", endDate),
    supabase.from("expenses").select("date, amount, saving_id").gte("date", startDate).lte("date", endDate),
  ])
  const byKey = new Map<string, { key: string; ingresos: number; gastos: number }>()
  for (const i of incomeRes.data ?? []) {
    const key = bucketKey(i.date, granularity)
    const cur = byKey.get(key) ?? { key, ingresos: 0, gastos: 0 }
    cur.ingresos += Number(i.amount)
    byKey.set(key, cur)
  }
  for (const e of expenseRes.data ?? []) {
    if (e.saving_id) continue
    const key = bucketKey(e.date, granularity)
    const cur = byKey.get(key) ?? { key, ingresos: 0, gastos: 0 }
    cur.gastos += Number(e.amount)
    byKey.set(key, cur)
  }
  const points: CashflowPoint[] = []
  let cursor = new Date(startDate + "T00:00:00")
  const end = new Date(endDate + "T00:00:00")
  let guard = 0
  while (cursor <= end && guard < 10000) {
    const key = bucketKey(toYmd(cursor), granularity)
    const cur = byKey.get(key) ?? { key, ingresos: 0, gastos: 0 }
    points.push({ key, label: labelFor(key, granularity), ingresos: cur.ingresos, gastos: cur.gastos })
    cursor = nextBucket(cursor, granularity)
    guard++
  }
  return points
}

export async function getCategoryCashflowData(startDate: string, endDate: string, granularity: CashflowGranularity): Promise<{ labels: string[]; items: CategoryCashflowItem[] }> {
  assertSupabaseConfigured()
  const [expenseRes, catsRes] = await Promise.all([
    supabase.from("expenses").select("date, amount, budget_category_id, saving_id").gte("date", startDate).lte("date", endDate),
    supabase.from("budget_categories").select("id, name, parent_id"),
  ])
  const cats = catsRes.data ?? []
  const parentIds = new Set(cats.filter((c) => c.parent_id).map((c) => c.parent_id))
  const nameById = new Map<string, string>()
  for (const c of cats) {
    if (!parentIds.has(c.id)) nameById.set(c.id, c.name)
  }

  const bucketOrder: string[] = []
  let cursor = new Date(startDate + "T00:00:00")
  const end = new Date(endDate + "T00:00:00")
  let guard = 0
  while (cursor <= end && guard < 10000) {
    bucketOrder.push(bucketKey(toYmd(cursor), granularity))
    cursor = nextBucket(cursor, granularity)
    guard++
  }
  const labels = bucketOrder.map((k) => labelFor(k, granularity))

  const totals = new Map<string, number[]>()
  for (const e of expenseRes.data ?? []) {
    if (!e.budget_category_id) continue
    const name = nameById.get(e.budget_category_id)
    if (!name) continue
    const key = bucketKey(e.date, granularity)
    const idx = bucketOrder.indexOf(key)
    if (idx < 0) continue
    const arr = totals.get(name) ?? new Array(bucketOrder.length).fill(0)
    arr[idx] += Number(e.amount)
    totals.set(name, arr)
  }

  const items: CategoryCashflowItem[] = [...totals.entries()].map(([name, arr]) => ({
    name,
    points: arr.map((gastos, i) => ({ key: bucketOrder[i], label: labels[i], gastos })),
  })).sort((a, b) => {
    const ta = a.points.reduce((s, p) => s + p.gastos, 0)
    const tb = b.points.reduce((s, p) => s + p.gastos, 0)
    return tb - ta
  })

  return { labels, items }
}

export async function getSavings(): Promise<SavingWithRelations[]> {
  const { data } = await supabase.from("savings").select("*, saving_categories(name)").order("name")
  return (data ?? []) as SavingWithRelations[]
}
export async function createSaving(data: Partial<Saving>) {
  return supabase.from("savings").insert(data).select().single()
}
export async function updateSaving(id: string, data: Partial<Saving>) {
  return supabase.from("savings").update(data).eq("id", id)
}
export async function deleteSaving(id: string) {
  return supabase.from("savings").delete().eq("id", id)
}

export async function createSavingMovement(data: Partial<SavingMovement>) {
  const { data: mov, error: movError } = await supabase.from("saving_movements").insert(data).select().single()
  if (movError) throw movError
  const { data: saving } = await supabase.from("savings").select("current_amount").eq("id", data.saving_id).single()
  const amountChange = data.type === "income" ? Number(data.amount ?? 0) : -Number(data.amount ?? 0)
  const newAmount = Math.max(0, Number(saving?.current_amount ?? 0) + amountChange)
  const { error: updateError } = await supabase.from("savings").update({ current_amount: newAmount }).eq("id", data.saving_id)
  if (updateError) throw updateError
  return mov
}
export async function getSavingMovements(savingId: string): Promise<SavingMovement[]> {
  const { data } = await supabase.from("saving_movements").select("*").eq("saving_id", savingId).order("movement_date", { ascending: false }).order("created_at", { ascending: false })
  return data ?? []
}

export async function getRecentSavingMovements(limit = 5) {
  const { data } = await supabase.from("saving_movements").select("*, savings(name)").order("movement_date", { ascending: false }).order("created_at", { ascending: false }).limit(limit)
  return (data ?? []) as (SavingMovement & { savings: Pick<Saving, "name"> })[]
}

export async function countAllSavingMovements(): Promise<number> {
  const { count } = await supabase.from("saving_movements").select("*", { count: "exact", head: true })
  return count ?? 0
}

export async function getSavingsDashboard(): Promise<SavingsDashboard> {
  const [savingsResult, recentMovements] = await Promise.all([
    supabase.from("savings").select("current_amount"),
    getRecentSavingMovements(5),
  ])
  const savings = savingsResult.data as Saving[] | null
  const totalAhorrado = savings?.reduce((sum: number, s: Saving) => sum + Number(s.current_amount), 0) ?? 0
  return { totalAhorrado, numHuchas: savings?.length ?? 0, recentMovements }
}

export async function getSavingCategories(): Promise<SavingCategory[]> {
  const { data } = await supabase.from("saving_categories").select("*").order("name")
  return data ?? []
}
export async function createSavingCategory(input: { name: string }) {
  return supabase.from("saving_categories").insert(input).select().single()
}
export async function updateSavingCategory(id: string, input: { name: string }) {
  return supabase.from("saving_categories").update(input).eq("id", id)
}
export async function deleteSavingCategory(id: string) {
  const { data: savs } = await supabase.from("savings").select("id").eq("category_id", id)
  const ids = (savs ?? []).map((s: Pick<Saving, "id">) => s.id)
  if (ids.length > 0) await supabase.from("savings").delete().in("id", ids)
  return supabase.from("saving_categories").delete().eq("id", id)
}

export async function getFutureExpenseCategories(): Promise<FutureExpenseCategory[]> {
  const { data } = await supabase.from("future_expense_categories").select("*").order("name")
  return data ?? []
}
export async function createFutureExpenseCategory(input: { name: string }) {
  return supabase.from("future_expense_categories").insert(input).select().single()
}
export async function updateFutureExpenseCategory(id: string, input: { name: string }) {
  return supabase.from("future_expense_categories").update(input).eq("id", id)
}
export async function deleteFutureExpenseCategory(id: string) {
  await supabase.from("future_expenses").update({ category_id: null }).eq("category_id", id)
  return supabase.from("future_expense_categories").delete().eq("id", id)
}

export async function getFutureExpenses(): Promise<FutureExpenseWithRelations[]> {
  const { data } = await supabase.from("future_expenses").select("*, future_expense_categories(name), savings(id, name, current_amount)").order("expected_date")
  return (data ?? []) as FutureExpenseWithRelations[]
}
export async function createFutureExpense(data: Partial<FutureExpense>) {
  const result = await supabase.from("future_expenses").insert({ ...data, saving_id: data.saving_id ?? null }).select("*, future_expense_categories(name), savings(id, name, current_amount)").single()
  if (result.error) throw result.error
  return result.data as FutureExpenseWithRelations
}
export async function updateFutureExpense(id: string, data: Partial<FutureExpense>) {
  const { data: existing } = await supabase.from("future_expenses").select("saving_id").eq("id", id).single()
  const finalSavingId = data.saving_id ?? existing?.saving_id ?? null
  const result = await supabase.from("future_expenses").update({ ...data, saving_id: finalSavingId }).eq("id", id)
  if (result.error) throw result.error
  return result
}
export async function deleteFutureExpense(id: string) {
  const { data: existing } = await supabase.from("future_expenses").select("saving_id").eq("id", id).single()
  const result = await supabase.from("future_expenses").delete().eq("id", id)
  if (result.error) throw result.error
  if (existing?.saving_id) {
    await supabase.from("saving_movements").delete().eq("saving_id", existing.saving_id)
    await supabase.from("savings").delete().eq("id", existing.saving_id)
  }
  return result
}
export async function updateFutureExpenseStatus(id: string, status: "planned" | "completed" | "cancelled") {
  return supabase.from("future_expenses").update({ status }).eq("id", id)
}
export async function getFutureExpenseBySaving(savingId: string): Promise<FutureExpense | null> {
  const { data } = await supabase.from("future_expenses").select("*, savings(id, name, current_amount)").eq("saving_id", savingId).maybeSingle()
  return (data as FutureExpense | null) ?? null
}
export async function completeFutureExpense(id: string, personId: string): Promise<void> {
  const { data: fe } = await supabase.from("future_expenses").select("*, savings(id, name, current_amount)").eq("id", id).single()
  if (!fe?.saving_id) throw new Error("Este gasto futuro no tiene hucha vinculada")
  const balance = Number((fe as FutureExpense & { savings: Pick<Saving, "current_amount"> | null }).savings?.current_amount ?? 0)
  const target = Number(fe.expected_amount)
  if (balance < target) throw new Error(`El objetivo aún no está completo (llevas ${balance.toFixed(2)} de ${target.toFixed(2)})`)
  const today = new Date().toISOString().split("T")[0]
  await createSavingMovement({
    saving_id: fe.saving_id,
    type: "withdrawal",
    amount: target,
    notes: `Objetivo completado: ${fe.title}`,
    movement_date: today,
  })
  await createIncome({
    person_id: personId,
    amount: target,
    description: `Gasto futuro completado: ${fe.title}`,
    date: today,
    category_id: null,
  })
  const { error } = await supabase.from("future_expenses").update({ status: "completed" }).eq("id", id)
  if (error) throw error
}
export async function completeFutureExpenseBySaving(savingId: string, personId: string): Promise<void> {
  const fe = await getFutureExpenseBySaving(savingId)
  if (!fe) throw new Error("No hay un gasto futuro vinculado a esta hucha")
  await completeFutureExpense(fe.id, personId)
}

export async function getCommitments(): Promise<CommitmentWithRelations[]> {
  const { data } = await supabase.from("commitments").select("*, budget_categories(name)").order("name")
  return (data ?? []) as CommitmentWithRelations[]
}
export async function createCommitment(data: Partial<Commitment>) {
  return supabase.from("commitments").insert(data).select().single()
}
export async function updateCommitment(id: string, data: Partial<Commitment>) {
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
export async function createCommitmentPayment(data: Partial<CommitmentPayment>) {
  const { data: payment, error } = await supabase.from("commitment_payments").insert(data).select().single()
  if (error) throw error
  if (data.commitment_id && data.capital_amount) {
    const { data: comm } = await supabase.from("commitments").select("current_balance").eq("id", data.commitment_id).single()
    const newBalance = Math.max(0, Number(comm?.current_balance ?? 0) - Number(data.capital_amount))
    await supabase.from("commitments").update({ current_balance: newBalance }).eq("id", data.commitment_id)
  }
  return payment
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
  const parentIds = new Set(cats.filter((c: BudgetCategory) => c.parent_id).map((c: BudgetCategory) => c.parent_id))
  return cats.filter((c: BudgetCategory) => !parentIds.has(c.id)).reduce((s, c) => s + Number(c.budgeted), 0)
}

export async function getMonthlyBudgetCategories(monthlyBudgetId: string, templateId: string): Promise<BudgetCategory[]> {
  const { data, error } = await supabase.from("budget_categories").select("*").eq("monthly_budget_id", monthlyBudgetId).order("name")
  if (!error && data && data.length > 0) return (data ?? []).map((c: BudgetCategory) => ({ ...c, parent_id: c.parent_id ?? null })) as BudgetCategory[]
  return getBudgetCategories(templateId)
}

function monthLabel(monthStr: string): string {
  const d = new Date(monthStr + "-01T12:00:00")
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

export async function getBudgetCategoriesForMonth(monthStr: string): Promise<BudgetCategoryWithTemplate[]> {
  const startDate = monthStr + "-01"
  const { data: mb } = await supabase.from("monthly_budgets").select("id, template_id").eq("month", startDate).maybeSingle()
  if (mb) {
    const cats = await getMonthlyBudgetCategories(mb.id, mb.template_id)
    if (cats.length > 0) {
      const label = monthLabel(monthStr)
      return cats.map((c: BudgetCategory) => ({ ...c, budget_templates: { name: label } }))
    }
  }
  const templates = await getBudgetTemplates()
  const base = templates.find((t: BudgetTemplate) => t.name.toLowerCase() === "modelo base")
  if (base) {
    const cats = await getBudgetCategories(base.id)
    return cats.map((c: BudgetCategory) => ({ ...c, budget_templates: { name: "Modelo base" } }))
  }
  return []
}

export async function getAllBudgetCategories(): Promise<BudgetCategoryWithTemplate[]> {
  const { data } = await supabase.from("budget_categories").select("*, budget_templates(name)").is("monthly_budget_id", null).order("name")
  return (data ?? []) as BudgetCategoryWithTemplate[]
}
export async function createBudgetCategory(data: Partial<BudgetCategory>) {
  return supabase.from("budget_categories").insert(data).select().single()
}
export async function updateBudgetCategory(id: string, data: Partial<BudgetCategory>) {
  return supabase.from("budget_categories").update(data).eq("id", id)
}
export async function deleteBudgetCategory(id: string) {
  return supabase.from("budget_categories").delete().eq("id", id)
}
export async function setBudgetCategoryPaid(id: string, is_paid: boolean) {
  return supabase.from("budget_categories").update({ is_paid }).eq("id", id)
}

export async function getMovementsByBudgetCategory(budgetCategoryId: string, childIds: string[] = [], startDate?: string, endDate?: string): Promise<ExpenseWithRelations[]> {
  const allIds = [budgetCategoryId, ...childIds]
  let query = supabase
    .from("expenses")
    .select("*")
    .in("budget_category_id", allIds)
    .order("date", { ascending: false })
  if (startDate) query = query.gte("date", startDate)
  if (endDate) query = query.lte("date", endDate)

  const { data: expenses, error } = await query
  if (error) throw error

  const exps = (expenses ?? []) as Expense[]
  const personIds = [...new Set(exps.map((e) => e.person_id))]
  const { data: people } = personIds.length > 0
    ? await supabase.from("people").select("id, name").in("id", personIds)
    : { data: [] }
  const peopleMap = new Map((people ?? []).map((p: { id: string; name: string }) => [p.id, { name: p.name }]))

  return exps.map((e) => ({ ...e, people: peopleMap.get(e.person_id) ?? null })) as ExpenseWithRelations[]
}

export async function getMonthlyBudgets(): Promise<MonthlyBudgetWithTotals[]> {
  const { data } = await supabase.from("monthly_budgets").select("*, budget_templates(name)").order("month", { ascending: false })
  const months = (data ?? []) as MonthlyBudgetWithTotals[]
  const withTotals = await Promise.all(months.map(async (m: MonthlyBudgetWithTotals) => {
    const cats = await getMonthlyBudgetCategories(m.id, m.template_id)
    const monthDate = new Date(m.month + "T00:00:00")
    const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split("T")[0]
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split("T")[0]
    const { data: expenses } = await supabase.from("expenses").select("amount").gte("date", startDate).lte("date", endDate)
    const totalSpent = (expenses ?? []).reduce((s: number, e: { amount: number | null }) => s + Number(e.amount), 0)
    return { ...m, totalBudgeted: sumBudgetLeaves(cats), totalSpent, hasMovements: totalSpent > 0 }
  }))
  return withTotals
}
export async function createMonthlyBudget(data: { template_id: string; month: string }) {
  const { data: mb, error } = await supabase.from("monthly_budgets").insert(data).select().single()
  if (error || !mb) return { data: null, error }
  const tplCats = await getBudgetCategories(data.template_id)
  const parents = tplCats.filter((c: BudgetCategory) => !c.parent_id)
  const children = tplCats.filter((c: BudgetCategory) => c.parent_id)
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
  for (const exp of (monthExpenses ?? []) as Expense[]) {
    const targetId = exp.budget_category_id ? idMap.get(exp.budget_category_id) : undefined
    if (targetId) await supabase.from("expenses").update({ budget_category_id: targetId }).eq("id", exp.id)
  }
  return { data: mb, error: null }
}
export async function deleteMonthlyBudget(id: string) {
  const { data: cats } = await supabase.from("budget_categories").select("id").eq("monthly_budget_id", id)
  const catIds = (cats ?? []).map((c: Pick<BudgetCategory, "id">) => c.id)
  if (catIds.length > 0) {
    await supabase.from("expenses").update({ budget_category_id: null }).in("budget_category_id", catIds)
    await supabase.from("commitments").update({ category_id: null }).in("category_id", catIds)
  }
  return supabase.from("monthly_budgets").delete().eq("id", id)
}

export type CatStatus = "green" | "yellow" | "red"

export interface MonthCategoryNode {
  id: string
  name: string
  budgeted: number
  spent: number
  available: number
  excess: number
  percentage: number
  status: CatStatus
  is_paid: boolean
  parent_id: string | null
  children: MonthCategoryNode[]
}

export async function getMonthlyBudgetDashboard(id: string) {
  const { data: mb, error } = await supabase.from("monthly_budgets").select("*, budget_templates(name)").eq("id", id).single()
  if (error || !mb) throw error
  const categories = await getMonthlyBudgetCategories(mb.id, mb.template_id)
  const monthDate = new Date(mb.month + "T00:00:00")
  const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split("T")[0]
  const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split("T")[0]
  const [expenseResult, incomeResult] = await Promise.all([
    supabase.from("expenses").select("amount, budget_category_id, saving_id").gte("date", startDate).lte("date", endDate),
    supabase.from("income").select("amount").gte("date", startDate).lte("date", endDate),
  ])
  const categorySpent: Record<string, number> = {}
  for (const exp of expenseResult.data ?? []) {
    if (exp.budget_category_id && !exp.saving_id) categorySpent[exp.budget_category_id] = (categorySpent[exp.budget_category_id] ?? 0) + Number(exp.amount)
  }
  const treeMap = new Map<string, BudgetCategory & { children: BudgetCategory[] }>()
  for (const cat of categories) treeMap.set(cat.id, { ...cat, children: [] })
  const roots: (BudgetCategory & { children: BudgetCategory[] })[] = []
  for (const cat of categories) {
    const node = treeMap.get(cat.id)!
    if (cat.parent_id && treeMap.has(cat.parent_id)) treeMap.get(cat.parent_id)!.children.push(node)
    else roots.push(node)
  }
  const nodeBudgeted = (n: BudgetCategory & { children: BudgetCategory[] }): number =>
    n.children.length === 0 ? Number(n.budgeted) : n.children.reduce((s: number, c: BudgetCategory) => s + nodeBudgeted(c as BudgetCategory & { children: BudgetCategory[] }), 0)
  const nodeSpent = (n: BudgetCategory & { children: BudgetCategory[] }): number =>
    n.children.length === 0 ? (categorySpent[n.id] ?? 0) : n.children.reduce((s: number, c: BudgetCategory) => s + nodeSpent(c as BudgetCategory & { children: BudgetCategory[] }), 0)
  const build = (n: BudgetCategory & { children: BudgetCategory[] }): MonthCategoryNode => {
    const budgeted = nodeBudgeted(n)
    const spent = nodeSpent(n)
    const available = Math.max(0, budgeted - spent)
    const excess = Math.max(0, spent - budgeted)
    const percentage = budgeted > 0 ? (spent / budgeted) * 100 : spent > 0 ? Infinity : 0
    let status: CatStatus = "green"
    if (percentage > 100) status = "red"
    else if (percentage >= 80) status = "yellow"
    return { id: n.id, name: n.name, budgeted, spent, available, excess, percentage, status, is_paid: Boolean(n.is_paid), parent_id: n.parent_id ?? null, children: n.children.map((c) => build(c as BudgetCategory & { children: BudgetCategory[] })) }
  }
  const builtRoots = roots.map(build)
  const totalBudgeted = roots.reduce((s: number, r: BudgetCategory & { children: BudgetCategory[] }) => s + nodeBudgeted(r), 0)
  const totalGastos = roots.reduce((s: number, r: BudgetCategory & { children: BudgetCategory[] }) => s + nodeSpent(r), 0)
  const totalIngresos = (incomeResult.data ?? []).reduce((s: number, i: { amount: number | null }) => s + Number(i.amount), 0)
  return {
    month: mb.month,
    templateName: mb.budget_templates?.name ?? "",
    totalIngresos,
    totalBudgeted,
    totalGastos,
    balance: totalIngresos - totalGastos,
    categories: builtRoots,
  }
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

export function subscribeToTable(table: string, callback: (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => void) {
  return supabase.channel(`${table}-changes`).on("postgres_changes", { event: "*", schema: "public", table }, (payload) => callback(payload as unknown as { new: Record<string, unknown>; old: Record<string, unknown> })).subscribe()
}

/* ---- Financial Insights ---- */

export type IncomeDropInsight = {
  type: "income_drop"
  currentMonth: string
  previousMonth: string
  currentAmount: number
  previousAmount: number
  dropPercent: number
}

export type SavingsRateInsight = {
  type: "low_savings_rate"
  month: string
  totalIncome: number
  totalDeposits: number
  rate: number
}

export type ChronicOverspendCategory = {
  categoryName: string
  currentExcess: number
  previousExcess: number | null
  budgeted: number
}

export type ChronicOverspendInsight = {
  type: "chronic_overspend"
  categories: ChronicOverspendCategory[]
}

export type FinancialInsight = IncomeDropInsight | SavingsRateInsight | ChronicOverspendInsight

export async function getFinancialInsights(): Promise<FinancialInsight[]> {
  assertSupabaseConfigured()
  const insights: FinancialInsight[] = []
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const prevMonthStr = `${prevMonthYear}-${String(prevMonth).padStart(2, "0")}`

  const [yearlyData, currentDash] = await Promise.all([
    getYearlyData(currentYear),
    getDashboardData([currentMonthStr]),
  ])

  if (currentDash) {
    const currentMonthData = yearlyData.find((m) => m.month === currentMonthStr)
    const prevMonthData = yearlyData.find((m) => m.month === prevMonthStr)

    if (currentMonthData && prevMonthData && prevMonthData.ingresos > 0) {
      const drop = ((prevMonthData.ingresos - currentMonthData.ingresos) / prevMonthData.ingresos) * 100
      if (drop > 10) {
        insights.push({
          type: "income_drop",
          currentMonth: currentMonthStr,
          previousMonth: prevMonthStr,
          currentAmount: currentMonthData.ingresos,
          previousAmount: prevMonthData.ingresos,
          dropPercent: Math.round(drop),
        })
      }
    }

    if (currentDash.totalIngresos > 0) {
      const { data: movements } = await supabase
        .from("saving_movements")
        .select("amount")
        .eq("type", "income")
        .gte("movement_date", `${currentMonthStr}-01`)
        .lte("movement_date", new Date(currentYear, currentMonth, 0).toISOString().split("T")[0])

      const totalDeposits = movements?.reduce((s: number, m: { amount: number }) => s + Number(m.amount), 0) ?? 0
      const rate = (totalDeposits / currentDash.totalIngresos) * 100

      if (rate < 10) {
        insights.push({
          type: "low_savings_rate",
          month: currentMonthStr,
          totalIncome: currentDash.totalIngresos,
          totalDeposits,
          rate: Math.round(rate),
        })
      }
    }
  }

  const { data: currentMb } = await supabase
    .from("monthly_budgets")
    .select("id, month")
    .eq("month", currentMonthStr + "-01")
    .maybeSingle()

  const { data: prevMb } = await supabase
    .from("monthly_budgets")
    .select("id, month")
    .eq("month", prevMonthStr + "-01")
    .maybeSingle()

  async function getSpentByCategory(mbId: string, monthStr: string): Promise<Record<string, number>> {
    const monthDate = new Date(monthStr + "-01T00:00:00")
    const y = monthDate.getFullYear()
    const m = monthDate.getMonth()
    const start = new Date(y, m, 1).toISOString().split("T")[0]
    const end = new Date(y, m + 1, 0).toISOString().split("T")[0]
    const { data } = await supabase
      .from("expenses")
      .select("amount, budget_category_id")
      .gte("date", start)
      .lte("date", end)
    const spent: Record<string, number> = {}
    for (const e of data ?? []) {
      if (e.budget_category_id) {
        spent[e.budget_category_id] = (spent[e.budget_category_id] ?? 0) + Number(e.amount)
      }
    }
    return spent
  }

  if (currentMb) {
    const currentCats = await getMonthlyBudgetCategories(currentMb.id, "")
    const currentSpent = await getSpentByCategory(currentMb.id, currentMonthStr)

    let prevSpent: Record<string, number> = {}
    if (prevMb) {
      prevSpent = await getSpentByCategory(prevMb.id, prevMonthStr)
    }

    const overspent: ChronicOverspendCategory[] = []
    for (const cat of currentCats) {
      if (Number(cat.budgeted) <= 0) continue
      const spent = currentSpent[cat.id] ?? 0
      const budgeted = Number(cat.budgeted)
      if (spent > budgeted) {
        const currentExcess = spent - budgeted
        let previousExcess: number | null = null
        if (prevMb) {
          const prevCats = await getMonthlyBudgetCategories(prevMb.id, "")
          const prevCat = prevCats.find((c) => c.name === cat.name)
          if (prevCat && Number(prevCat.budgeted) > 0) {
            const prevSpentAmount = prevSpent[prevCat.id] ?? 0
            if (prevSpentAmount > Number(prevCat.budgeted)) {
              previousExcess = prevSpentAmount - Number(prevCat.budgeted)
            }
          }
        }
        overspent.push({
          categoryName: cat.name,
          currentExcess,
          previousExcess,
          budgeted,
        })
      }
    }

    overspent.sort((a, b) => b.currentExcess - a.currentExcess)

    if (overspent.length > 0) {
      insights.push({
        type: "chronic_overspend",
        categories: overspent,
      } as ChronicOverspendInsight)
    }
  }

  return insights
}
