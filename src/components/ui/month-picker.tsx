"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

interface MonthPickerProps {
  value: string
  onChange: (value: string) => void
  onClose?: () => void
}

interface MultiMonthPickerProps {
  initialMonths: string[]
  onChange: (months: string[]) => void
  onClose?: () => void
}

export function MonthPicker({ value, onChange, onClose }: MonthPickerProps) {
  const [year, setYear] = useState(value ? parseInt(value.split("-")[0]) : new Date().getFullYear())
  const selectedMonth = value ? parseInt(value.split("-")[1]) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setYear(y => y - 1)}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold">{year}</span>
        <button
          type="button"
          onClick={() => setYear(y => y + 1)}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {MONTHS.map((name, idx) => {
          const monthStr = String(idx + 1).padStart(2, "0")
          const isSelected = selectedMonth === idx + 1 && value?.split("-")[0] === String(year)
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChange(`${year}-${monthStr}`)
                onClose?.()
              }}
              className={`text-xs py-1.5 rounded-md border transition-colors cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary font-medium"
                  : "bg-background border-input hover:bg-muted/50 hover:border-muted-foreground/30"
              }`}
            >
              {name.slice(0, 4)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatMonthShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-CO", { month: "short", year: "numeric" }).replace(".", "")
}

export function MultiMonthPicker({ initialMonths, onChange, onClose }: MultiMonthPickerProps) {
  const [year, setYear] = useState(() => {
    if (initialMonths.length > 0) return parseInt(initialMonths[0].split("-")[0])
    return new Date().getFullYear()
  })
  const [draft, setDraft] = useState<string[]>(initialMonths)
  const [manualInput, setManualInput] = useState("")
  const [manualError, setManualError] = useState("")

  const isSelected = (monthStr: string) => draft.includes(`${year}-${monthStr}`)

  const toggleMonth = (monthStr: string) => {
    const key = `${year}-${monthStr}`
    setDraft(prev =>
      prev.includes(key)
        ? prev.filter(m => m !== key)
        : [...prev, key].sort()
    )
    setManualInput("")
    setManualError("")
  }

  const handleManualAdd = () => {
    const trimmed = manualInput.trim()
    if (!trimmed) return
    const match = trimmed.match(/^(\d{4})-(\d{2})$/)
    if (!match) {
      setManualError("Formato: YYYY-MM (ej: 2026-08)")
      return
    }
    const m = parseInt(match[2], 10)
    if (m < 1 || m > 12) {
      setManualError("El mes debe ser 01-12")
      return
    }
    const key = `${match[1]}-${match[2]}`
    setDraft(prev => prev.includes(key) ? prev : [...prev, key].sort())
    setManualInput("")
    setManualError("")
  }

  const handleApply = () => {
    onChange(draft)
    onClose?.()
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="YYYY-MM"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleManualAdd() }}
            className="h-7 px-2 text-xs rounded-md border border-input bg-transparent flex-1 min-w-0 outline-none focus:border-ring font-mono"
          />
          <button
            type="button"
            onClick={handleManualAdd}
            className="h-7 px-2 text-xs rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            +
          </button>
        </div>
        {manualError && <p className="text-[10px] text-red-500 mt-0.5">{manualError}</p>}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setYear(y => y - 1)}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold">{year}</span>
        <button
          type="button"
          onClick={() => setYear(y => y + 1)}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {MONTHS.map((name, idx) => {
          const monthStr = String(idx + 1).padStart(2, "0")
          const active = isSelected(monthStr)
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleMonth(monthStr)}
              className={`text-xs py-1.5 rounded-md border transition-colors cursor-pointer ${
                active
                  ? "bg-primary text-primary-foreground border-primary font-medium"
                  : "bg-background border-input hover:bg-muted/50 hover:border-muted-foreground/30"
              }`}
            >
              {name.slice(0, 4)}
            </button>
          )
        })}
      </div>

      {draft.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {draft.map(m => (
            <span key={m} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md tabular-nums">
              {formatMonthShort(m)}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleApply}
        className="w-full text-xs py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
      >
        Aplicar {draft.length > 0 ? `(${draft.length} mes${draft.length !== 1 ? "es" : ""})` : ""}
      </button>
    </div>
  )
}