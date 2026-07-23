export interface Person {
  id: string
  name: string
  created_at: string
}

export interface Income {
  id: string
  person_id: string
  amount: number
  description: string
  date: string
  created_at: string
}

export interface Expense {
  id: string
  person_id: string
  amount: number
  description: string
  date: string
  created_at: string
  budget_category_id?: string | null
}

export interface BudgetTemplate {
  id: string
  name: string
  created_at: string
}

export interface BudgetCategory {
  id: string
  template_id: string
  name: string
  budgeted: number
  parent_id: string | null
}

export interface MonthlyBudget {
  id: string
  template_id: string
  month: string
  created_at: string
}

export interface SavingCategory {
  id: string
  name: string
  created_at: string
}

export interface Saving {
  id: string
  name: string
  description: string
  current_amount: number
  category_id: string | null
  created_at: string
}

export interface FutureExpenseCategory {
  id: string
  name: string
  created_at: string
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
  created_at: string
}

export interface SavingMovement {
  id: string
  saving_id: string
  type: "income" | "withdrawal"
  amount: number
  notes: string
  movement_date: string
  created_at: string
}

export interface Commitment {
  id: string
  name: string
  description: string
  total_amount: number
  current_balance: number
  category_id: string | null
  created_at: string
}

export interface AllowedUser {
  id: string
  email: string
  active: boolean
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role: "admin" | "user"
  created_at: string
}

export interface CommitmentPayment {
  id: string
  commitment_id: string
  amount: number
  capital_amount: number
  date: string
  notes: string
  created_at: string
}
