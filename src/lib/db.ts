import { supabase } from "./supabase"
import type { Person, Income, Expense } from "@/types"

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

/* ---- Income ---- */

export async function getIncomes(options?: { person_id?: string; limit?: number }) {
  let query = supabase
    .from("income")
    .select("*, people(name)")
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
  return data as (Income & { people: Pick<Person, "name"> })[]
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

/* ---- Expenses ---- */

export async function getExpenses(options?: { person_id?: string; limit?: number }) {
  let query = supabase
    .from("expenses")
    .select("*, people(name)")
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
  return data as (Expense & { people: Pick<Person, "name"> })[]
}

export async function createExpense(expense: {
  person_id: string
  amount: number
  description: string
  date: string
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

/* ---- Dashboard totals ---- */

export async function getDashboardData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const [incomeResult, expenseResult, recentIncomes, recentExpenses] = await Promise.all([
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
  ])

  const totalIngresos =
    incomeResult.data?.reduce((sum, i) => sum + Number(i.amount), 0) ?? 0
  const totalGastos =
    expenseResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0

  return {
    totalIngresos,
    totalGastos,
    balance: totalIngresos - totalGastos,
    recentIncomes,
    recentExpenses,
  }
}
