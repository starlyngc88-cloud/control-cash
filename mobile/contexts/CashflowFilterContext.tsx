import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

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

const FILTER_KEY = "cashflow-filter"

function getDefaultDates() {
  const d = new Date()
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]
  return { start, end }
}

export function CashflowFilterProvider({ children }: { children: React.ReactNode }) {
  const defaults = getDefaultDates()
  const [startDate, setStartDateState] = useState(defaults.start)
  const [endDate, setEndDateState] = useState(defaults.end)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(FILTER_KEY).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { startDate?: string; endDate?: string }
          if (parsed.startDate) setStartDateState(parsed.startDate)
          if (parsed.endDate) setEndDateState(parsed.endDate)
        } catch {}
      }
      setHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (!hydrated) return
    AsyncStorage.setItem(FILTER_KEY, JSON.stringify({ startDate, endDate }))
  }, [startDate, endDate, hydrated])

  const setStartDate = (s: string) => setStartDateState(s)
  const setEndDate = (e: string) => setEndDateState(e)

  return (
    <CashflowFilterContext.Provider value={{ startDate, endDate, setStartDate, setEndDate }}>
      {children}
    </CashflowFilterContext.Provider>
  )
}

export function useCashflowFilter() {
  return useContext(CashflowFilterContext)
}
