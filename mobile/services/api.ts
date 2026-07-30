import { supabase } from "@/lib/supabase"
import type { Person, ExpenseCategory, IncomeCategory, DashboardData, BudgetTemplate, BudgetCategory, MonthlyBudget, FutureExpenseCategory, FutureExpense, Commitment, CommitmentPayment, AllowedUser } from "@/types/database"

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
  let query = supabase
    .from("expenses")
    .select("*, people(name), expense_categories(name)")
    .order("date", { ascending: false })
  if (opts?.startDate) query = query.gte("date", opts.startDate)
  if (opts?.endDate) query = query.lte("date", opts.endDate)
  const { data } = await query
  return data ?? []
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
  let query = supabase
    .from("income")
    .select("*, people(name), income_categories(name)")
    .order("date", { ascending: false })
  if (opts?.startDate) query = query.gte("date", opts.startDate)
  if (opts?.endDate) query = query.lte("date", opts.endDate)
  const { data } = await query
  return data ?? []
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
  if (months.length === 0) return null
  const sorted = [...months].sort()
  const startDate = sorted[0] + "-01"
  const last = sorted[sorted.length - 1]
  const endDate = new Date(parseInt(last.split("-")[0]), parseInt(last.split("-")[1]), 0).toISOString().split("T")[0]

  const [incomesData, expensesData, budgetData] = await Promise.all([
    getIncomes({ startDate, endDate }),
    getExpenses({ startDate, endDate }),
    supabase.from("budget_categories").select("budgeted"),
  ])

  const totalIngresos = incomesData.reduce((s: number, i: any) => s + Number(i.amount), 0)
  const totalGastos = expensesData.reduce((s: number, e: any) => s + Number(e.amount), 0)
  const totalBudgeted = (budgetData.data ?? []).reduce((s: number, b: any) => s + Number(b.budgeted), 0)
  const balance = totalIngresos - totalGastos

  return { totalBudgeted, totalIngresos, totalGastos, balance, recentIncomes: incomesData.slice(0, 5), recentExpenses: expensesData.slice(0, 5) }
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
export async function getAllBudgetCategories(): Promise<any[]> {
  const { data } = await supabase.from("budget_categories").select("*, budget_templates(name)").order("name")
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
  return data ?? []
}
export async function createMonthlyBudget(data: { template_id: string; month: string }) {
  return supabase.from("monthly_budgets").insert(data).select().single()
}
export async function deleteMonthlyBudget(id: string) {
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
