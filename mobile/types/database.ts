export interface Person {
  id: string
  name: string
  created_at?: string
}

export type ExpenseCategoryTab = "categoria" | "disponible" | "hucha"

export interface ExpenseCategory {
  id: string
  name: string
  tab?: ExpenseCategoryTab | null
  created_at?: string
}

export interface IncomeCategory {
  id: string
  name: string
  created_at?: string
}

export interface BudgetTemplate {
  id: string
  name: string
  created_at?: string
}

export interface BudgetCategory {
  id: string
  template_id: string
  name: string
  budgeted: number
  parent_id: string | null
  monthly_budget_id?: string | null
  is_paid?: boolean
}

export interface MonthlyBudget {
  id: string
  template_id: string
  month: string
  created_at?: string
}

export interface Expense {
  id: string
  person_id: string
  amount: number
  description: string
  date: string
  expense_category_id: string | null
  budget_category_id: string | null
  saving_id?: string | null
  created_at?: string
}

export interface Income {
  id: string
  person_id: string
  amount: number
  description: string
  date: string
  category_id: string | null
  created_at?: string
}

export interface FutureExpenseCategory {
  id: string
  name: string
  created_at?: string
}

export interface FutureExpense {
  id: string
  title: string
  description: string
  category: string
  category_id: string | null
  expected_amount: number
  expected_date: string
  status: "planned" | "completed" | "cancelled"
  saving_id?: string | null
  created_at?: string
}

export interface SavingCategory {
  id: string
  name: string
  created_at?: string
}

export interface Saving {
  id: string
  name: string
  description: string | null
  target_amount: number
  current_amount: number
  category_id?: string | null
  created_at?: string
}

export interface SavingMovement {
  id: string
  saving_id: string
  type: "income" | "withdrawal"
  amount: number
  notes: string | null
  movement_date: string
  expense_id?: string | null
  created_at?: string
}

export interface SavingsDashboard {
  totalAhorrado: number
  numHuchas: number
  recentMovements: (SavingMovement & { savings: Pick<Saving, "name"> })[]
}

export interface Commitment {
  id: string
  name: string
  total_amount: number
  current_balance: number
  description: string | null
  category_id: string | null
  created_at?: string
}

export interface CommitmentPayment {
  id: string
  commitment_id: string
  amount: number
  capital_amount: number
  notes: string | null
  date: string
  created_at?: string
}

export interface AllowedUser {
  id: string
  email: string
  active: boolean
  created_at?: string
}

export interface UserRole {
  id: string
  user_id: string
  role: "admin" | "user"
  created_at?: string
}

export interface YearlyMonth {
  month: string
  ingresos: number
  gastos: number
  presupuesto: number
  balance: number
}

export interface DashboardData {
  totalBudgeted: number
  totalIngresos: number
  totalGastos: number
  totalGastosConRubro: number
  totalGastosSinRubro: number
  balance: number
  recentIncomes: (Income & { people: Pick<Person, "name"> | null })[]
  recentExpenses: (Expense & { people: Pick<Person, "name"> | null })[]
}

export type CashflowGranularity = "day" | "week" | "month" | "year"

export interface CashflowPoint {
  key: string
  label: string
  ingresos: number
  gastos: number
}

export interface CategoryCashflowItem {
  name: string
  points: { key: string; label: string; gastos: number }[]
}

export interface IncomeDropInsight {
  type: "income_drop"
  currentMonth: string
  previousMonth: string
  currentAmount: number
  previousAmount: number
  dropPercent: number
}

export interface SavingsRateInsight {
  type: "low_savings_rate"
  month: string
  totalIncome: number
  totalDeposits: number
  rate: number
}

export interface ChronicOverspendInsight {
  type: "chronic_overspend"
  categoryName: string
  timesOverBudget: number
  totalMonths: number
  totalExcess: number
}

export type FinancialInsight = IncomeDropInsight | SavingsRateInsight | ChronicOverspendInsight
