export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 1000)
}

export function validateAmount(amount: unknown): number {
  const num = Number(amount)
  if (Number.isNaN(num) || num < 0) throw new Error("Monto inválido")
  return Math.round(num * 100) / 100
}

export function validateDate(date: unknown): string {
  if (typeof date !== "string") throw new Error("Fecha inválida")
  const d = new Date(date + "T00:00:00")
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida")
  return date
}

export function validateId(id: unknown): string {
  if (typeof id !== "string" || id.length < 10) throw new Error("ID inválido")
  return id
}

export function validateRequired(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} es requerido`)
  }
  return sanitizeInput(value)
}
