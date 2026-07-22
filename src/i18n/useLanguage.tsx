"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
import type { Dictionary, Language, Currency } from "./index"
import { registerLanguage, getDictionary, CURRENCY_CONFIG } from "./index"
import standard from "./standard"
import kellycaribe from "./kellycaribe"

registerLanguage("standard", standard)
registerLanguage("kellycaribe", kellycaribe)

const STORAGE_KEY = "kellycash-language"
const CURRENCY_KEY = "kellycash-currency"

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "standard"
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "standard" || stored === "kellycaribe") return stored
  return "standard"
}

function getInitialCurrency(): Currency {
  if (typeof window === "undefined") return "COP"
  const stored = localStorage.getItem(CURRENCY_KEY)
  if (stored === "COP" || stored === "EUR") return stored
  return "COP"
}

type LanguageContextValue = {
  t: Dictionary
  language: Language
  setLanguage: (lang: Language) => void
  currency: Currency
  setCurrency: (c: Currency) => void
  fmt: (n: number) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("standard")
  const [t, setT] = useState<Dictionary>(getDictionary("standard"))
  const [currency, setCurrencyState] = useState<Currency>("COP")

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    setT(getDictionary(lang))
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang)
    }
  }, [])

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c)
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENCY_KEY, c)
    }
  }, [])

  const fmt = useMemo(() => {
    return (n: number) => {
      const cfg = CURRENCY_CONFIG[currency]
      const formatted = n.toLocaleString(cfg.locale, { minimumFractionDigits: 2 })
      return currency === "EUR" ? `${formatted} ${cfg.symbol}` : `${cfg.symbol}${formatted}`
    }
  }, [currency])

  useEffect(() => {
    const stored = getInitialLanguage()
    if (stored !== "standard") {
      setLanguageState(stored)
      setT(getDictionary(stored))
    }
    setCurrencyState(getInitialCurrency())
  }, [])

  return (
    <LanguageContext.Provider value={{ t, language, setLanguage, currency, setCurrency, fmt }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return ctx
}
