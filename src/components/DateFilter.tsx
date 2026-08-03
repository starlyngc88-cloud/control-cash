"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { MultiMonthPicker } from "@/components/ui/month-picker"
import { Calendar } from "lucide-react"
import { useMonthFilter } from "@/components/MonthFilterContext"

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

function getMonthId(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function DateFilter() {
  const { months, setMonths } = useMonthFilter()
  const [open, setOpen] = useState(false)

  const now = new Date()
  const currentMonth = getMonthId(now)
  const nowYear = now.getFullYear()

  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonth = getMonthId(prevDate)

  const yearMonths = useMemo(() => {
    const y = nowYear
    return Array.from({ length: 12 }, (_, i) =>
      `${y}-${String(i + 1).padStart(2, "0")}`
    )
  }, [nowYear])

  const isCurrentMonth = months.length === 1 && months[0] === currentMonth
  const isPreviousMonth = months.length === 1 && months[0] === previousMonth
  const isThisYear = months.length === 12 && months.every((m, i) => m === yearMonths[i])

  const label = useMemo(() => {
    if (months.length === 0) return "Seleccionar"
    if (months.length === 1) return formatMonth(months[0])
    return `${formatMonth(months[0])} - ${formatMonth(months[months.length - 1])}`
  }, [months])

  return (
    <div suppressHydrationWarning className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
      <button
        onClick={() => setMonths([currentMonth])}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
          isCurrentMonth
            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Este Mes
      </button>
      <button
        onClick={() => setMonths([previousMonth])}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
          isPreviousMonth
            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Mes Pasado
      </button>
      <button
        onClick={() => setMonths(yearMonths)}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
          isThisYear
            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Este Año
      </button>

      <div className="w-px h-5 bg-slate-300 mx-1.5" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<button type="button" className="flex items-center gap-1.5 px-2 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer" />}>
          <Calendar className="size-3.5" />
          <span className="text-xs font-medium hidden sm:inline">{label}</span>
        </DialogTrigger>
        <DialogContent className="max-w-xs sm:max-w-sm">
          <MultiMonthPicker initialMonths={months} onChange={setMonths} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
