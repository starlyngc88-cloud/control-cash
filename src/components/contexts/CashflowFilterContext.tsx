"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type CashflowGranularity = "day" | "week" | "month" | "year"

type CashflowFilterContextType = {
  startDate: string
  endDate: string
  setStartDate: (s: string) => void
  setEndDate: (e: string) => void
}

const CashflowFilterContext = createContext<CashflowFilterContextType>({
  startDate: "",
  endDate: "",
  setStartDate: () => {},
  setEndDate: () => {},
})

export function autoGranularity(startDate: string, endDate: string): CashflowGranularity {
  const start = new Date(startDate + "T00:00:00").getTime()
  const end = new Date(endDate + "T00:00:00").getTime()
  if (!startDate || !endDate || Number.isNaN(start) || Number.isNaN(end)) return "day"
  const days = Math.round((end - start) / 86400000)
  if (days <= 45) return "day"
  if (days <= 183) return "week"
  if (days <= 450) return "month"
  return "year"
}

const GRANULARITY_LABEL: Record<CashflowGranularity, string> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
  year: "Año",
}

export function granularityLabel(g: CashflowGranularity): string {
  return GRANULARITY_LABEL[g]
}

export function CashflowFilterProvider({ children }: { children: ReactNode }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]
  })

  return (
    <CashflowFilterContext.Provider value={{ startDate, endDate, setStartDate, setEndDate }}>
      {children}
    </CashflowFilterContext.Provider>
  )
}

export function useCashflowFilter() {
  return useContext(CashflowFilterContext)
}
