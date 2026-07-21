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
}
