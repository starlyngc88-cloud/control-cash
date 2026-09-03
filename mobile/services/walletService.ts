import { parseWalletNotification, type ParsedPayment } from "./walletParser"
import { createExpense, findOrCreateWalletCategory } from "./api"
import { supabase } from "@/lib/supabase"
import type { Expense } from "@/types/database"

const DEBUG = typeof __DEV__ !== "undefined" ? __DEV__ : true

function log(msg: string, data?: unknown) {
  if (DEBUG) console.log(`[KellyCash][Wallet] ${msg}`, data ?? "")
}

export type WalletPayment = ParsedPayment & {
  expenseId?: string
  status: "captured" | "confirmed" | "error"
  error?: string
}

let walletCategoryId: string | null = null

async function ensureWalletCategory(): Promise<string | null> {
  if (walletCategoryId) return walletCategoryId
  const id = await findOrCreateWalletCategory()
  walletCategoryId = id
  return id
}

async function resolvePersonId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return null
  const { data: person } = await supabase
    .from("people")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()
  return person?.id ?? null
}

export async function handleWalletNotification(
  title: string,
  text: string,
  personId?: string
): Promise<WalletPayment | null> {
  const parsed = parseWalletNotification(title, text)
  if (!parsed) {
    log("No se pudo parsear la notificación", { title, text })
    return null
  }

  log("Pago parseado", parsed)

  const resolvedPersonId = await resolvePersonId(personId)
  if (!resolvedPersonId) {
    log("No se pudo resolver personId para la notificación")
    return { ...parsed, status: "error", error: "No se pudo identificar la persona" }
  }

  const categoryId = await ensureWalletCategory()
  if (!categoryId) {
    log("No se pudo crear la categoría WALLET")
    return { ...parsed, status: "error", error: "No se pudo crear la categoría WALLET" }
  }

  try {
    const expenseData: Partial<Expense> = {
      person_id: resolvedPersonId,
      amount: parsed.amount,
      description: parsed.description,
      date: parsed.date,
      expense_category_id: categoryId,
    }

    const result = await createExpense(expenseData)
    const expense = result as Expense

    log("Gasto creado desde wallet", { id: expense.id, amount: parsed.amount })

    return {
      ...parsed,
      expenseId: expense.id,
      status: "confirmed",
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido"
    log("Error creando gasto desde wallet", { error: msg })
    return { ...parsed, status: "error", error: msg }
  }
}

export function resetWalletCategoryCache() {
  walletCategoryId = null
}
