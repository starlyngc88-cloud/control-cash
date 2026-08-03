"use client"

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react"

type MonthFilterContextType = {
  months: string[]
  setMonths: (m: string[]) => void
}

const MonthFilterContext = createContext<MonthFilterContextType>({
  months: [],
  setMonths: () => {},
})

function isValidMonth(m: unknown): m is string {
  return typeof m === "string" && /^\d{4}-\d{2}$/.test(m)
}

function getInitialMonths(defaultMonth: string): string[] {
  if (typeof window === "undefined") return [defaultMonth]
  const saved = localStorage.getItem("dashboard-months")
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidMonth)) return parsed
    } catch {}
  }
  return [defaultMonth]
}

export function MonthFilterProvider({ children }: { children: ReactNode }) {
  const defaultMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }, [])

  const [months, setMonths] = useState<string[]>([defaultMonth])

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = getInitialMonths(defaultMonth)
    queueMicrotask(() => {
      setMonths((prev) => {
        if (saved.join(",") === prev.join(",")) return prev
        return saved
      })
    })
  }, [defaultMonth])

  useEffect(() => {
    localStorage.setItem("dashboard-months", JSON.stringify(months))
  }, [months])

  return (
    <MonthFilterContext.Provider value={{ months, setMonths }}>
      {children}
    </MonthFilterContext.Provider>
  )
}

export function useMonthFilter() {
  return useContext(MonthFilterContext)
}