export type ParsedPayment = {
  amount: number
  description: string
  date: string
  raw: string
}

function normalizeAmount(raw: string): number | null {
  let cleaned = raw.replace(/\s/g, "")

  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else if (/^\d+,\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(",", ".")
  } else {
    cleaned = cleaned.replace(/,/g, "")
  }

  const amount = parseFloat(cleaned)
  return !isNaN(amount) && amount > 0 ? amount : null
}

function extractAmount(text: string): number | null {
  const patterns = [
    /\$\s*([\d.,]+)/,
    /€\s*([\d.,\s]+)/,
    /([\d.,\s]+)\s*€/,
    /COP\s*([\d.,]+)/,
    /USD\s*([\d.,]+)/,
    /EUR\s*([\d.,\s]+)/,
    /([\d.,\s]+)\s*(?:COP|USD|EUR)/,
    /monto[:\s]*[$€]?\s*([\d.,\s]+)/i,
    /pago[:\s]*[$€]?\s*([\d.,\s]+)/i,
    /total[:\s]*[$€]?\s*([\d.,\s]+)/i,
    /([\d]{1,3}(?:\.\d{3})+(?:,\d{2})?)/,
    /([\d]+,\d{2})/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const amount = normalizeAmount(match[1])
      if (amount !== null) return amount
    }
  }
  return null
}

function extractCardName(text: string): string | null {
  const match = text.match(/con\s+(.+?)$/i)
  if (match) {
    const card = match[1].trim()
    if (card.length > 1) return card
  }
  return null
}

function extractDescription(title: string, text: string): string {
  const cleanText = text
    .replace(/[$€]\s*[\d.,]+/g, "")
    .replace(/[\d.,]+\s*€/g, "")
    .replace(/COP|USD|EUR/gi, "")
    .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, "")
    .replace(/\d{1,2}:\d{2}/g, "")
    .replace(/\*\*\d+/g, "")
    .replace(/✅/g, "")
    .replace(/con\s+/gi, "")
    .trim()

  const merchant = title.length > 3 ? title.trim() : null
  const cardName = extractCardName(text)

  if (merchant && cardName) return `${merchant} - ${cardName}`
  if (merchant) return merchant
  if (cleanText.length > 3) return cleanText
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
