export type ParsedPayment = {
  amount: number
  description: string
  date: string
  raw: string
}

function extractAmount(text: string): number | null {
  const patterns = [
    /\$\s*([\d.,]+)/,
    /COP\s*([\d.,]+)/,
    /USD\s*([\d.,]+)/,
    /([\d.,]+)\s*(?:COP|USD|\$)/,
    /monto[:\s]*\$?\s*([\d.,]+)/i,
    /pago[:\s]*\$?\s*([\d.,]+)/i,
    /total[:\s]*\$?\s*([\d.,]+)/i,
    /([\d]{1,3}(?:\.[\d]{3})+(?:,\d{2})?)/,
    /([\d]+,\d{2})/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const raw = match[1].replace(/\./g, "").replace(",", ".")
      const amount = parseFloat(raw)
      if (!isNaN(amount) && amount > 0) return amount
    }
  }
  return null
}

function extractDescription(title: string, text: string): string {
  const cleanText = text
    .replace(/\$[\d.,]+/g, "")
    .replace(/COP|USD/gi, "")
    .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, "")
    .replace(/\d{1,2}:\d{2}/g, "")
    .trim()

  if (cleanText.length > 3) return cleanText
  if (title.length > 3) return title
  return "Pago Wallet"
}

function extractDate(text: string): string {
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      const [, day, month, year] = match
      const fullYear = year.length === 2 ? `20${year}` : year
      return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
  }

  return new Date().toISOString().split("T")[0]
}

export function parseWalletNotification(title: string, text: string): ParsedPayment | null {
  const combined = `${title} ${text}`
  const amount = extractAmount(combined)

  if (!amount) return null

  return {
    amount,
    description: extractDescription(title, text),
    date: extractDate(combined),
    raw: combined,
  }
}
