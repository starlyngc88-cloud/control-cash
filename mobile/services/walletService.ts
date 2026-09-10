import { parseWalletNotification, type ParsedPayment } from "./walletParser"
import { createExpense, findOrCreateWalletCategory } from "./api"
import { supabase } from "@/lib/supabase"
import type { Expense } from "@/types/database"

const DEBUG = typeof __DEV__ !== "undefined" ? __DEV__ : true

function log(msg: string, data?: unknown) {
  if (DEBUG) console.log(`[KellyCash][Wallet][Service] ${msg}`, data ?? "")
}

function logError(msg: string, data?: unknown) {
  console.error(`[KellyCash][Wallet][Service] ${msg}`, data ?? "")
}

export type WalletPayment = ParsedPayment & {
  expenseId?: string
  status: "captured" | "confirmed" | "error"
  error?: string
}

let walletCategoryId: string | null = null

async function ensureWalletCategory(): Promise<string | null> {
  if (walletCategoryId) {
    log("Categoría WALLET ya en caché:", walletCategoryId)
    return walletCategoryId
  }
  log("Buscando/creando categoría WALLET en Supabase...")
  const id = await findOrCreateWalletCategory()
  walletCategoryId = id
  log("Categoría WALLET result:", id)
  return id
}

async function resolvePersonId(explicit?: string): Promise<string | null> {
  if (explicit) {
    log("Usando personId explícito del hook:", explicit)
    return explicit
  }
  log("Resolviendo personId desde sesión de Supabase...")
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) {
    logError("No hay userId en la sesión de Supabase")
    return null
  }
  log("userId de sesión:", userId)
  const { data: person, error } = await supabase
    .from("people")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    logError("Error consultando people:", error.message)
    return null
  }
  log("personId resuelto:", person?.id ?? "null")
  return person?.id ?? null
}

export async function handleWalletNotification(
  title: string,
  text: string,
  personId?: string
): Promise<WalletPayment | null> {
  log("=== INICIO handleWalletNotification ===")
  log("Entrada:", { title, text, personId })

  const parsed = parseWalletNotification(title, text)
  if (!parsed) {
    logError("No se pudo parsear la notificación - retorno null")
    log("Texto completo que falló:", `${title} ${text}`)
    return null
  }

  log("Parse exitoso:", {
    amount: parsed.amount,
    description: parsed.description,
    date: parsed.date,
    raw: parsed.raw,
  })

  const resolvedPersonId = await resolvePersonId(personId)
  if (!resolvedPersonId) {
    logError("No se pudo resolver personId")
    return { ...parsed, status: "error", error: "No se pudo identificar la persona" }
  }

  const categoryId = await ensureWalletCategory()
  if (!categoryId) {
    logError("No se pudo crear/obtener la categoría WALLET")
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

    log("Insertando gasto en Supabase:", expenseData)
    const result = await createExpense(expenseData)
    const expense = result as Expense

    log("Gasto creado EXITOSAMENTE:", { id: expense.id, amount: parsed.amount })
    log("=== FIN handleWalletNotification (éxito) ===")

    return {
      ...parsed,
      expenseId: expense.id,
      status: "confirmed",
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido"
    logError("Error creando gasto desde wallet:", msg)
    log("=== FIN handleWalletNotification (error) ===")
    return { ...parsed, status: "error", error: msg }
  }
}

export function resetWalletCategoryCache() {
  walletCategoryId = null
}
