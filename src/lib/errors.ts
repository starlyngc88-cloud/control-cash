import type { ZodError } from "zod"

const FRIENDLY = "⚠️ Epa, algo salió mal. Inténtalo nuevamente."

export function friendlyError(err: unknown): string {
  if (typeof err === "string") return err
  if (err instanceof Error && "issues" in err) {
    const zodErr = err as ZodError
    return zodErr.issues.map((e: { message: string }) => e.message).join(". ")
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes("duplicate") || msg.includes("unique")) return "Este registro ya existe."
    if (msg.includes("foreign key") || msg.includes("constraint")) return "No se puede eliminar porque tiene registros asociados."
    if (msg.includes("not found")) return "El registro no existe."
    if (msg.includes("network") || msg.includes("fetch")) return "Error de conexión. Verifica tu internet."
    if (msg.includes("timeout")) return "La operación tardó demasiado. Inténtalo nuevamente."
  }
  return FRIENDLY
}

export function logError(context: string, err: unknown): void {
  const safe = err instanceof Error ? { name: err.name, message: err.message } : String(err)
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${context}]`, safe)
  }
}