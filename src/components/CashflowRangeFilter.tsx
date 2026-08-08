"use client"

import { useCashflowFilter } from "@/components/contexts/CashflowFilterContext"

const pad = (n: number) => String(n).padStart(2, "0")
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

type RangePreset = { key: string; label: string; start: string; end: string }

function buildRangePresets(): RangePreset[] {
  const now = new Date()
  const y = now.getFullYear()
  const monthStart = toYmd(new Date(y, now.getMonth(), 1))
  const monthEnd = toYmd(new Date(y, now.getMonth() + 1, 0))

  const qStart = new Date(y, now.getMonth() - 2, 1)
  const quarterStart = toYmd(qStart)
  const quarterEnd = monthEnd

  return [
    { key: "month", label: "Este mes", start: monthStart, end: monthEnd },
    { key: "quarter", label: "Trimestre", start: quarterStart, end: quarterEnd },
    { key: "year", label: "Año", start: `${y}-01-01`, end: toYmd(new Date(y, 11, 31)) },
  ]
}

export function CashflowRangeFilter() {
  const { startDate, setStartDate, endDate, setEndDate } = useCashflowFilter()
  const rangePresets = buildRangePresets()

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        {rangePresets.map((preset) => {
          const active = startDate === preset.start && endDate === preset.end
          return (
            <button
              key={preset.key}
              onClick={() => {
                setStartDate(preset.start)
                setEndDate(preset.end)
              }}
              className={`px-3 py-1 text-xs font-medium transition-colors ${active ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
        />
        <span className="text-xs text-slate-400">a</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
        />
      </div>
    </div>
  )
}