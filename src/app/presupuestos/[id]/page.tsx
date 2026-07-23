"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getMonthlyBudgetDashboard, getPeople, createExpense } from "@/lib/db"
import type { DashboardCategory } from "@/lib/db"
import type { Person } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Circle, ChevronDown, ChevronRight } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function MonthlyBudgetPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<Awaited<ReturnType<typeof getMonthlyBudgetDashboard>> | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const { t, fmt } = useLanguage()
  const d = t.presupuestoDetail

  const [openExpense, setOpenExpense] = useState(false)
  const [expCatId, setExpCatId] = useState("")
  const [expCatName, setExpCatName] = useState("")
  const [expAmount, setExpAmount] = useState("")
  const [expDesc, setExpDesc] = useState("")
  const [expPerson, setExpPerson] = useState("")
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (!id) return
    Promise.all([getMonthlyBudgetDashboard(id), getPeople()])
      .then(([res, p]) => {
        setData(res)
        setPeople(p)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>
  if (!data) return <p className="text-muted-foreground">{d.notFound}</p>

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  }

  const parents = data.categories.filter(c => !c.parent_id)
  const childrenMap = new Map<string, DashboardCategory[]>()
  for (const cat of data.categories) {
    if (cat.parent_id) {
      const arr = childrenMap.get(cat.parent_id) ?? []
      arr.push(cat)
      childrenMap.set(cat.parent_id, arr)
    }
  }

  const openAddExpense = (catId: string, catName: string) => {
    setExpCatId(catId)
    setExpCatName(catName)
    setExpAmount("")
    setExpDesc("")
    setExpPerson(people[0]?.id ?? "")
    setExpDate(new Date().toISOString().split("T")[0])
    setOpenExpense(true)
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expAmount || !expPerson) return
    await createExpense({
      person_id: expPerson,
      amount: parseFloat(expAmount),
      description: expDesc || expCatName,
      date: expDate,
      budget_category_id: expCatId,
    })
    setOpenExpense(false)
    const res = await getMonthlyBudgetDashboard(id)
    setData(res)
  }

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link href="/presupuestos" className="flex items-center justify-center size-7 rounded hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h2 className="text-lg font-bold capitalize">{formatMonth(data.month)}</h2>
        <span className="text-xs text-muted-foreground">· {data.templateName}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs border rounded-lg px-3 py-2 bg-muted/30">
        {(() => {
          const parentIds = data.categories.filter(c => !c.parent_id).map(c => c.id)
          if (parentIds.length === 0) return null
          const allExpanded = parentIds.every(id => expanded.has(id))
          return (
            <button
              onClick={() => {
                if (allExpanded) {
                  setExpanded(new Set())
                } else {
                  setExpanded(new Set(parentIds))
                }
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border hover:bg-muted shrink-0"
            >
              {allExpanded ? "▲" : "▼"}
            </button>
          )
        })()}
        <span><span className="text-muted-foreground">{d.ingresos}</span> <b className="text-green-600">{fmt(data.totalIngresos)}</b></span>
        <span><span className="text-muted-foreground">{d.presupuestado}</span> <b className="text-blue-600">{fmt(data.totalBudgeted)}</b></span>
        <span><span className="text-muted-foreground">{d.gastado}</span> <b className="text-red-600">{fmt(data.totalGastos)}</b></span>
        <span><span className="text-muted-foreground">{d.balance}</span> <b className={data.balance >= 0 ? "text-green-600" : "text-red-600"}>{fmt(data.balance)}</b></span>
      </div>

      {data.categories.length === 0 ? (
        <p className="text-xs text-muted-foreground">{d.empty}</p>
      ) : (
        <div className="border rounded-lg max-h-[70vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-muted/50">
                <th className="text-left py-1.5 px-2 font-medium text-muted-foreground w-1/3 bg-muted/50">{d.rubro}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground bg-muted/50">{d.ppto}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground bg-muted/50">{d.gastado}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground bg-muted/50">{d.disponible}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground bg-muted/50">{d.exceso}</th>
                <th className="text-center py-1.5 px-2 font-medium text-muted-foreground w-16 bg-muted/50">{d.estado}</th>
              </tr>
            </thead>
            <tbody>
              {parents.flatMap((parent) => {
                const children = childrenMap.get(parent.id) ?? []
                const isExpanded = expanded.has(parent.id)

                const ppct = parent.percentage === Infinity ? 0 : Math.round(parent.percentage)
                const ppctClass =
                  ppct === 0 ? "text-green-700 bg-green-100 dark:bg-green-900/40" :
                  ppct >= 100 ? "text-red-700 bg-red-100 dark:bg-red-900/40" :
                  "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40"

                const parentRow = (
                  <tr key={parent.id} className="border-b hover:bg-muted/30">
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1">
                        {children.length > 0 ? (
                          <button onClick={() => toggle(parent.id)} className="p-0.5 rounded hover:bg-accent text-gray-400 hover:text-gray-600">
                            {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                          </button>
                        ) : (
                          <button onClick={() => openAddExpense(parent.id, parent.name)} className="p-0.5 rounded hover:bg-accent" title={`Agregar gasto a ${parent.name}`}>
                            <span className="text-sm leading-none">➕</span>
                          </button>
                        )}
                        <Circle className={`size-2.5 fill-current shrink-0 ${
                          parent.status === "green" ? "text-green-500" :
                          parent.status === "yellow" ? "text-yellow-500" : "text-red-500"
                        }`} />
                        <span className="font-medium truncate">{parent.name}</span>
                      </div>
                    </td>
                    <td className="py-1 px-2 text-right tabular-nums">{fmt(parent.budgeted)}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-medium">{fmt(parent.spent)}</td>
                    <td className={`py-1 px-2 text-right tabular-nums ${parent.available <= 0 ? "text-red-600 font-medium" : ""}`}>{fmt(parent.available)}</td>
                    <td className="py-1 px-2 text-right tabular-nums">
                      {parent.excess > 0 ? <span className="text-red-600 font-medium">{fmt(parent.excess)}</span> : <span className="text-muted-foreground">{d.emDash}</span>}
                    </td>
                    <td className="py-1 px-2 text-center">
                      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${ppctClass}`}>
                        {ppct > 0 ? `${ppct}%` : d.emDash}
                      </span>
                    </td>
                  </tr>
                )

                const childRows = isExpanded ? children.map((child) => {
                  const cpct = child.percentage === Infinity ? 0 : Math.round(child.percentage)
                  const cpctClass =
                    cpct === 0 ? "text-green-700 bg-green-100 dark:bg-green-900/40" :
                    cpct >= 100 ? "text-red-700 bg-red-100 dark:bg-red-900/40" :
                    "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40"
                  return (
                    <tr key={child.id} className="border-b hover:bg-muted/20 bg-muted/5">
                      <td className="py-0.5 px-2 pl-8">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openAddExpense(child.id, child.name)} className="p-0.5 rounded hover:bg-accent" title={`Agregar gasto a ${child.name}`}>
                            <span className="text-xs leading-none">➕</span>
                          </button>
                          <Circle className={`size-2 fill-current shrink-0 ${
                            child.status === "green" ? "text-green-500" :
                            child.status === "yellow" ? "text-yellow-500" : "text-red-500"
                          }`} />
                          <span className="text-muted-foreground">└ {child.name}</span>
                        </div>
                      </td>
                      <td className="py-0.5 px-2 text-right tabular-nums">{fmt(child.budgeted)}</td>
                      <td className="py-0.5 px-2 text-right tabular-nums font-medium">{fmt(child.spent)}</td>
                      <td className={`py-0.5 px-2 text-right tabular-nums ${child.available <= 0 ? "text-red-600 font-medium" : ""}`}>{fmt(child.available)}</td>
                      <td className="py-0.5 px-2 text-right tabular-nums">
                        {child.excess > 0 ? <span className="text-red-600 font-medium">{fmt(child.excess)}</span> : <span className="text-muted-foreground">{d.emDash}</span>}
                      </td>
                      <td className="py-0.5 px-2 text-center">
                        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${cpctClass}`}>
                          {cpct > 0 ? `${cpct}%` : d.emDash}
                        </span>
                      </td>
                    </tr>
                  )
                }) : []

                return [parentRow, ...childRows]
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={openExpense} onOpenChange={setOpenExpense}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar gasto: {expCatName}</DialogTitle></DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expPerson">Persona</Label>
              <select
                id="expPerson"
                value={expPerson}
                onChange={(e) => setExpPerson(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                required
              >
                <option value="">Seleccionar persona</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expAmount">Monto</Label>
              <Input id="expAmount" type="number" step="0.01" min="0.01" placeholder="0.00" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expDesc">Descripción (opcional)</Label>
              <Input id="expDesc" placeholder={expCatName} value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expDate">Fecha</Label>
              <Input id="expDate" type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Guardar gasto</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
