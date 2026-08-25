export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function todayString(): string {
  return toLocalDateString(new Date())
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

export function getMonthId(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function friendlyError(err: unknown): string {
  if (typeof err === "string") return err
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>
    if (typeof e.message === "string") return e.message
    if (typeof e.error_description === "string") return e.error_description
    if (typeof e.error === "string") return e.error
  }
  return "Epa, algo salió mal. Intenta de nuevo."
}
