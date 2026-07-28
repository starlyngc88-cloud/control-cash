const HTML_TAG_RE = /<[^>]*>/g
const SCRIPT_RE = /javascript\s*:/gi
const ON_EVENT_RE = /^\s*on\w+\s*=/i

export function sanitize(value: string): string {
  return value
    .replace(HTML_TAG_RE, "")
    .replace(SCRIPT_RE, "")
    .trim()
}

export function sanitizeInput<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    result[key] = typeof value === "string" ? sanitize(value) : value
  }
  return result as T
}