"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { MultiMonthPicker } from "@/components/ui/month-picker"
import { Calendar, ChevronDown } from "lucide-react"
import { useMonthFilter } from "@/components/MonthFilterContext"

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

export function DateFilter() {
  const { months, setMonths } = useMonthFilter()
  const [open, setOpen] = useState(false)

  const label = months.length === 0
    ? "Seleccionar"
    : months.length === 1
    ? formatMonth(months[0])
    : `${formatMonth(months[0])} - ${formatMonth(months[months.length - 1])}`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full border bg-background shadow-xs hover:bg-muted/50 hover:shadow-sm cursor-pointer transition-all text-xs" />}>
        <Calendar className="size-3.5 text-violet-500 shrink-0" />
        <span className="tabular-nums font-medium text-foreground">{label}</span>
        <span className="flex items-center justify-center size-4 rounded-full bg-muted/50 text-muted-foreground"><ChevronDown className="size-3" /></span>
      </DialogTrigger>
      <DialogContent className="max-w-64">
        <MultiMonthPicker initialMonths={months} onChange={setMonths} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}