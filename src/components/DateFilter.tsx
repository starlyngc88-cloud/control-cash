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

  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonth = getMonthId(prevDate)

  const yearMonths = useMemo(() => {
    const y = now.getFullYear()
    return Array.from({ length: 12 }, (_, i) =>
      `${y}-${String(i + 1).padStart(2, "0")}`
    )
  }, [now.getFullYear()])

  const isCurrentMonth = months.length === 1 && months[0] === currentMonth
  const isPreviousMonth = months.length === 1 && months[0] === previousMonth
  const isThisYear = months.length === 12 && months.every((m, i) => m === yearMonths[i])

  const label = months.length === 0
    ? "Seleccionar"
    : months.length === 1
    ? formatMonth(months[0])
    : `${formatMonth(months[0])} - ${formatMonth(months[months.length - 1])}`

  return (
    <div suppressHydrationWarning className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
      <button
        onClick={() => setMonths([currentMonth])}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
          isCurrentMonth
            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Este Mes
      </button>
      <button
        onClick={() => setMonths([previousMonth])}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
          isPreviousMonth
            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Mes Pasado
      </button>
      <button
        onClick={() => setMonths(yearMonths)}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
          isThisYear
            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Este Año
      </button>

      <div className="w-px h-6 bg-slate-300 mx-2" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<button type="button" className="flex items-center gap-2 px-3 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer" />}>
          <Calendar className="size-4" />
          <span className="text-sm font-medium hidden sm:inline">{label}</span>
        </DialogTrigger>
        <DialogContent className="max-w-64">
          <MultiMonthPicker initialMonths={months} onChange={setMonths} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
