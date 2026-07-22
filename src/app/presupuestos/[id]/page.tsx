"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getMonthlyBudgetDashboard } from "@/lib/db"
import type { MonthlyBudgetDashboard } from "@/lib/db"
import { ArrowLeft, Circle } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function MonthlyBudgetPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<MonthlyBudgetDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()
  const d = t.presupuestoDetail

  useEffect(() => {
    if (!id) return
    getMonthlyBudgetDashboard(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>
  if (!data) return <p className="text-muted-foreground">{d.notFound}</p>

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  }

  const fmt = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 2 })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link href="/presupuestos" className="flex items-center justify-center size-7 rounded hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h2 className="text-lg font-bold capitalize">{formatMonth(data.month)}</h2>
        <span className="text-xs text-muted-foreground">· {data.templateName}</span>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs border rounded-lg px-3 py-2 bg-muted/30">
        <span><span className="text-muted-foreground">{d.ingresos}</span> <b className="text-green-600">${fmt(data.totalIngresos)}</b></span>
        <span><span className="text-muted-foreground">{d.presupuestado}</span> <b className="text-blue-600">${fmt(data.totalBudgeted)}</b></span>
        <span><span className="text-muted-foreground">{d.gastado}</span> <b className="text-red-600">${fmt(data.totalGastos)}</b></span>
        <span><span className="text-muted-foreground">{d.balance}</span> <b className={data.balance >= 0 ? "text-green-600" : "text-red-600"}>${fmt(data.balance)}</b></span>
      </div>

      {data.categories.length === 0 ? (
        <p className="text-xs text-muted-foreground">{d.empty}</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-1.5 px-2 font-medium text-muted-foreground w-1/3">{d.rubro}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">{d.ppto}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">{d.gastado}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">{d.disponible}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">{d.exceso}</th>
                <th className="text-center py-1.5 px-2 font-medium text-muted-foreground w-16">{d.estado}</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((cat) => {
                const pct = cat.percentage === Infinity ? 0 : Math.round(cat.percentage)
                return (
                  <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1.5">
                        <Circle className={`size-2.5 fill-current shrink-0 ${
                          cat.status === "green" ? "text-green-500" :
                          cat.status === "yellow" ? "text-yellow-500" : "text-red-500"
                        }`} />
                        <span className="font-medium truncate">{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-1 px-2 text-right tabular-nums">${fmt(cat.budgeted)}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-medium">${fmt(cat.spent)}</td>
                    <td className={`py-1 px-2 text-right tabular-nums ${cat.available <= 0 ? "text-red-600 font-medium" : ""}`}>${fmt(cat.available)}</td>
                    <td className="py-1 px-2 text-right tabular-nums">
                      {cat.excess > 0 ? <span className="text-red-600 font-medium">${fmt(cat.excess)}</span> : <span className="text-muted-foreground">{d.emDash}</span>}
                    </td>
                    <td className="py-1 px-2 text-center">
                      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        cat.status === "green" ? "text-green-700 bg-green-100 dark:bg-green-900/40" :
                        cat.status === "yellow" ? "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40" :
                        "text-red-700 bg-red-100 dark:bg-red-900/40"
                      }`}>
                        {pct > 0 ? `${pct}%` : d.emDash}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
