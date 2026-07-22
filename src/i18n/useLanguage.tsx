"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { Dictionary, Language } from "./index"
import { registerLanguage, getDictionary } from "./index"
import standard from "./standard"
import kellycaribe from "./kellycaribe"

registerLanguage("standard", standard)
registerLanguage("kellycaribe", kellycaribe)

const STORAGE_KEY = "kellycash-language"

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "standard"
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "standard" || stored === "kellycaribe") return stored
  return "standard"
}

type LanguageContextValue = {
  t: Dictionary
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("standard")
  const [t, setT] = useState<Dictionary>(getDictionary("standard"))

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    setT(getDictionary(lang))
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang)
    }
  }, [])

  useEffect(() => {
    const stored = getInitialLanguage()
    if (stored !== "standard") {
      setLanguageState(stored)
      setT(getDictionary(stored))
    }
  }, [])

  return (
    <LanguageContext.Provider value={{ t, language, setLanguage }}>
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
