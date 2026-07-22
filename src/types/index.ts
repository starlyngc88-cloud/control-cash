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
