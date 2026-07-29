"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type MonthFilterContextType = {
  months: string[]
  setMonths: (m: string[]) => void
}

const MonthFilterContext = createContext<MonthFilterContextType>({
  months: [],
  setMonths: () => {},
})

export function MonthFilterProvider({ children }: { children: ReactNode }) {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [months, setMonths] = useState<string[]>([defaultMonth])

  useEffect(() => {
    const saved = localStorage.getItem("dashboard-months")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setMonths(parsed)
      } catch {}
    }
  }, [])

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