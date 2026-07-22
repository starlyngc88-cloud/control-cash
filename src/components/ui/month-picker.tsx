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
