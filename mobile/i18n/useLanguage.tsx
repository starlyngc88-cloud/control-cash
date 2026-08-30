import { useState, useEffect, createContext, useContext } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Language, Dictionary, Currency } from "./types"
import { esStandard } from "./es"
import { esKellyCaribe } from "./kellycaribe"

const dictionaries: Record<Language, Dictionary> = {
  standard: esStandard,
  kellycaribe: esKellyCaribe,
}

interface LanguageState {
  language: Language
  currency: Currency
  dictionary: Dictionary
  setLanguage: (lang: Language) => Promise<void>
  setCurrency: (cur: Currency) => Promise<void>
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageState | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("standard")
  const [currency, setCurrencyState] = useState<Currency>("COP")

  useEffect(() => {
    AsyncStorage.getItem("app_language").then((v) => {
      if (v === "standard" || v === "kellycaribe") setLanguageState(v)
    })
    AsyncStorage.getItem("app_currency").then((v) => {
      if (v === "COP" || v === "EUR") setCurrencyState(v)
    })
  }, [])

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang)
    await AsyncStorage.setItem("app_language", lang)
  }

  const setCurrency = async (cur: Currency) => {
    setCurrencyState(cur)
    await AsyncStorage.setItem("app_currency", cur)
  }

  const dictionary = dictionaries[language]

  const t = (key: string): string => {
    const keys = key.split(".")
    let val: any = dictionary
    for (const k of keys) {
      if (val && typeof val === "object" && k in val) val = val[k]
      else return key
    }
    return typeof val === "string" ? val : key
  }

  return (
    <LanguageContext.Provider value={{ language, currency, dictionary, setLanguage, setCurrency, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}
