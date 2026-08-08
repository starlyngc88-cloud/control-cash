"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

type Props = {
  items: string[]
  value: string[] | null
  onChange: (next: string[] | null) => void
}

export function CategoryMultiSelect({ items, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isAll = value === null

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  useEffect(() => {
    if (value === null) return
    const valid = new Set(items)
    const pruned = value.filter((v) => valid.has(v))
    if (pruned.length !== value.length) onChange(pruned)
  }, [items, value, onChange])

  const toggleItem = (name: string) => {
    if (isAll) {
      onChange(items.filter((i) => i !== name))
      return
    }
    const next = value.filter((v) => v !== name)
    onChange(value.includes(name) ? next : [...next, name])
  }

  const toggleAll = () => {
    onChange(isAll ? [] : null)
  }

  const label = isAll ? "Todas" : value.length === 0 ? "Ninguna" : `${value.length} ${value.length === 1 ? "categoría" : "categorías"}`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
      >
        Categorías: {label}
        <ChevronDown className="size-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-56 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1.5">
          <button
            type="button"
            onClick={toggleAll}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-left hover:bg-slate-50 transition-colors ${!isAll && value.length > 0 ? "text-indigo-600" : "text-slate-700"}`}
          >
            <span className={`flex size-4 items-center justify-center rounded border transition-colors ${isAll ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
              {isAll && <Check className="size-3 text-white" />}
            </span>
            Todas las categorías
          </button>
          <div className="my-1 h-px bg-slate-100" />
          {items.map((name) => {
            const selected = isAll || value.includes(name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleItem(name)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <span className={`flex size-4 items-center justify-center rounded border transition-colors ${selected ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                  {selected && <Check className="size-3 text-white" />}
                </span>
                <span className="truncate">{name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}