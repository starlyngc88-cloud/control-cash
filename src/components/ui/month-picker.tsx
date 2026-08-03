"use client"

import { useState, useMemo, useCallback } from "react"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function getMonthId(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthsBetween(a: string, b: string): string[] {
  const [y1, m1] = a.split("-").map(Number)
  const [y2, m2] = b.split("-").map(Number)
  const start = y1 * 12 + m1
  const end = y2 * 12 + m2
  const from = Math.min(start, end)
  const to = Math.max(start, end)
  const result: string[] = []
  for (let i = from; i <= to; i++) {
    const y = Math.floor((i - 1) / 12)
    const m = ((i - 1) % 12) + 1
    result.push(`${y}-${String(m).padStart(2, "0")}`)
  }
  return result
}

function isRange(draft: string[]): boolean {
  if (draft.length < 2) return false
  const sorted = [...draft].sort()
  for (let i = 1; i < sorted.length; i++) {
    const [py, pm] = sorted[i - 1].split("-").map(Number)
    const [cy, cm] = sorted[i].split("-").map(Number)
    const prevMonthIndex = py * 12 + pm
    const currMonthIndex = cy * 12 + cm
    if (currMonthIndex - prevMonthIndex !== 1) return false
  }
  return true
}

function getRangeInfo(draft: string[]) {
  if (!isRange(draft) || draft.length === 0) return null
  const sorted = [...draft].sort()
  return { start: sorted[0], end: sorted[sorted.length - 1] }
}

interface MonthPickerProps {
  value: string
  onChange: (value: string) => void
  onClose?: () => void
}

export function MonthPicker({ value, onChange, onClose }: MonthPickerProps) {
  const [year, setYear] = useState(value ? parseInt(value.split("-")[0]) : new Date().getFullYear())
  const selectedMonth = value ? parseInt(value.split("-")[1]) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setYear(y => y - 1)}
          className="size-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="text-sm font-bold text-slate-800 tabular-nums w-14 text-center">{year}</span>
        <button
          type="button"
          onClick={() => setYear(y => y + 1)}
          className="size-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTHS_SHORT.map((name, idx) => {
          const monthStr = String(idx + 1).padStart(2, "0")
          const active = selectedMonth === idx + 1 && value?.split("-")[0] === String(year)
          return (
            <button
              key={idx}
              type="button"
              onClick={() => { onChange(`${year}-${monthStr}`); onClose?.() }}
              className={`text-xs py-2 rounded-xl transition-all select-none cursor-pointer font-medium ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface MultiMonthPickerProps {
  initialMonths: string[]
  onChange: (months: string[]) => void
  onClose?: () => void
}

export function MultiMonthPicker({ initialMonths, onChange, onClose }: MultiMonthPickerProps) {
  const now = useMemo(() => new Date(), [])
  const currentMonth = useMemo(() => getMonthId(now), [now])

  const [year, setYear] = useState(() => {
    if (initialMonths.length > 0) return parseInt(initialMonths[0].split("-")[0])
    return now.getFullYear()
  })
  const [draft, setDraft] = useState<string[]>(initialMonths)
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState("")
  const [manualError, setManualError] = useState("")

  const getCurrentMonth = () => [currentMonth]
  const getLastQuarter = () => {
    const cur = now.getMonth() + 1
    const y = now.getFullYear()
    const m1 = cur - 2
    const m2 = cur - 1
    const m3 = cur
    return [
      `${m1 <= 0 ? y - 1 : y}-${String(m1 <= 0 ? m1 + 12 : m1).padStart(2, "0")}`,
      `${m2 <= 0 ? y - 1 : y}-${String(m2 <= 0 ? m2 + 12 : m2).padStart(2, "0")}`,
      `${y}-${String(m3).padStart(2, "0")}`,
    ]
  }

  const activePreset = useMemo(() => {
    const sorted = [...draft].sort()
    const fullYear = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`)
    const current = [currentMonth].sort()
    const cur = now.getMonth() + 1
    const y = now.getFullYear()
    const m1 = cur - 2
    const m2 = cur - 1
    const quarter = [
      `${m1 <= 0 ? y - 1 : y}-${String(m1 <= 0 ? m1 + 12 : m1).padStart(2, "0")}`,
      `${m2 <= 0 ? y - 1 : y}-${String(m2 <= 0 ? m2 + 12 : m2).padStart(2, "0")}`,
      `${y}-${String(cur).padStart(2, "0")}`,
    ].sort()
    if (sorted.length === current.length && sorted.every((m, i) => m === current[i])) return "current"
    if (sorted.length === quarter.length && sorted.every((m, i) => m === quarter[i])) return "quarter"
    if (sorted.length === fullYear.length && sorted.every((m, i) => m === fullYear[i])) return "year"
    return "custom"
  }, [draft, year, currentMonth, now])

  const applyPreset = (preset: "current" | "quarter" | "year") => {
    if (preset === "current") setDraft(getCurrentMonth())
    else if (preset === "quarter") setDraft(getLastQuarter())
    else setDraft(Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`))
    setRangeStart(null)
    setManualInput("")
    setManualError("")
  }

  const handleMonthClick = useCallback((monthStr: string) => {
    const key = `${year}-${monthStr}`
    setManualInput("")
    setManualError("")

    setDraft(prev => {
      const isSelected = prev.includes(key)

      // If clicking an already selected month and it's part of a range, deselect it
      if (isSelected) {
        setRangeStart(null)
        return prev.filter(m => m !== key)
      }

      // If there's a range start, complete the range
      if (rangeStart) {
        const range = monthsBetween(rangeStart, key)
        const newDraft = [...prev.filter(m => !range.includes(m)), ...range].sort()
        // Remove duplicates from previous selection that might overlap
        const unique = [...new Set(newDraft)].sort()
        setRangeStart(null)
        return unique
      }

      // First click in a potential range
      setRangeStart(key)
      return [...prev, key].sort()
    })
  }, [year, rangeStart])

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
    setRangeStart(null)
  }

  const handleConfirm = () => {
    onChange(draft)
    onClose?.()
  }

  const rangeInfo = useMemo(() => getRangeInfo(draft), [draft])

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Elegir período financiero</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setYear(y => y - 1)}
            className="size-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-sm font-bold text-slate-800 tabular-nums w-12 text-center">{year}</span>
          <button
            type="button"
            onClick={() => setYear(y => y + 1)}
            className="size-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-2 gap-1.5 py-3">
        <button
          type="button"
          onClick={() => applyPreset("current")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${
            activePreset === "current"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
          }`}
        >
          {activePreset === "current" && <Check className="size-3" />}
          Este Mes
        </button>
        <button
          type="button"
          onClick={() => applyPreset("quarter")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${
            activePreset === "quarter"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
          }`}
        >
          {activePreset === "quarter" && <Check className="size-3" />}
          Último Trimestre
        </button>
        <button
          type="button"
          onClick={() => applyPreset("year")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${
            activePreset === "year"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
          }`}
        >
          {activePreset === "year" && <Check className="size-3" />}
          Año Completo
        </button>
        <div className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${
          activePreset === "custom"
            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
            : "bg-white text-slate-400 border-slate-200"
        }`}>
          {activePreset === "custom" && <Check className="size-3" />}
          Personalizado
        </div>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-3 gap-1">
        {MONTHS_SHORT.map((name, idx) => {
          const monthStr = String(idx + 1).padStart(2, "0")
          const key = `${year}-${monthStr}`
          const isSelected = draft.includes(key)

          // Determine range position
          let rangeRole: "start" | "middle" | "end" | "single" | null = null
          if (isSelected && rangeInfo) {
            if (draft.length === 1) rangeRole = "single"
            else if (key === rangeInfo.start) rangeRole = "start"
            else if (key === rangeInfo.end) rangeRole = "end"
            else rangeRole = "middle"
          }

          const baseClass =
            "text-xs py-2 rounded-xl transition-all select-none cursor-pointer font-medium"
          const selectedClass = isSelected
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100"
          const rangeEdgeClass =
            rangeRole === "single"
              ? "bg-indigo-600 text-white shadow-sm"
              : rangeRole === "start"
              ? "bg-indigo-600 text-white rounded-r-none"
              : rangeRole === "end"
              ? "bg-indigo-500/85 text-white shadow-sm rounded-l-none"
              : rangeRole === "middle"
              ? "bg-indigo-100 text-indigo-700 rounded-none"
              : selectedClass

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleMonthClick(monthStr)}
              className={`${baseClass} ${rangeRole ? rangeEdgeClass : selectedClass} ${
                rangeStart === key ? "ring-2 ring-indigo-400 ring-offset-1" : ""
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span>{name}</span>
                {rangeRole === "end" && <Check className="size-3 shrink-0" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="YYYY-MM"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleManualAdd() }}
            className="h-7 px-2 text-[10px] rounded-xl border border-slate-200 bg-white flex-1 min-w-0 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 font-mono"
          />
          <button
            type="button"
            onClick={handleManualAdd}
            className="h-7 px-3 text-[10px] rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shrink-0 text-[9px]"
          >
            + Mes
          </button>
        </div>
        {manualError && <p className="text-[9px] text-red-500">{manualError}</p>}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Confirmar Selección ({draft.length} {draft.length === 1 ? "Mes" : "Meses"})
        </button>
      </div>
    </div>
  )
}
