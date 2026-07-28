"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardData, getMonthlyBudgets, getYearlyData } from "@/lib/db"
import type { YearlyMonth } from "@/lib/db"
import { LayoutDashboard, Wallet, PiggyBank } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { useMonthFilter } from "@/components/MonthFilterContext"
import { DateFilter } from "@/components/DateFilter"

type DashboardData = {
  totalIngresos: number
  totalGastos: number
  totalBudgeted: number
  balance: number
  recentIncomes: any[]
  recentExpenses: any[]
}

export default function DashboardPage() {
  const { months } = useMonthFilter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [monthlyBudgetId, setMonthlyBudgetId] = useState<string | null>(null)
  const [yearlyData, setYearlyData] = useState<YearlyMonth[]>([])
  const [loading, setLoading] = useState(true)
  const { t, fmt } = useLanguage()
  const d = t.dashboard
  const filteredYearly = useMemo(() => {
    if (!months.length) return yearlyData
    return yearlyData.filter(m => months.includes(m.month))
  }, [yearlyData, months])

  const load = useCallback(async (m: string[]) => {
    setLoading(true)
    try {
      const [res, budgets, yearly] = await Promise.all([getDashboardData(m), getMonthlyBudgets(), getYearlyData(new Date().getFullYear())])
      setData(res)
      setYearlyData(yearly)
      if (m.length === 1) {
        const firstDay = m[0] + "-01"
        const mb = budgets.find((b) => b.month === firstDay)
        setMonthlyBudgetId(mb?.id ?? null)
      } else {
        setMonthlyBudgetId(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(months) }, [months, load])

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  return (
    <div className="h-full overflow-y-auto space-y-2.5 pr-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-7 rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30">
            <LayoutDashboard className="size-3.5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">{d.title}</h2>
            <p className="text-[10px] text-muted-foreground -mt-0.5">{d.subtitle}</p>
          </div>
        </div>
        <DateFilter />
      </div>

      <div className="grid gap-1.5 grid-cols-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 bg-background col-span-1">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">{d.ingresos}</p>
            <p className="text-xs font-bold tabular-nums text-green-600">{fmt(data?.totalIngresos ?? 0)}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">{d.gastos}</p>
            <p className="text-xs font-bold tabular-nums text-red-600">{fmt(data?.totalGastos ?? 0)}</p>
          </div>
        </div>
        <StatBadge label={d.balance} value={fmt(data?.balance ?? 0)} color={(data?.balance ?? 0) >= 0 ? "text-green-600" : "text-red-600"} />
        <StatBadge label="Presupuesto" value={fmt(data?.totalBudgeted ?? 0)} color="text-violet-600" icon={monthlyBudgetId ? <Link href={`/presupuestos/${monthlyBudgetId}`}><PiggyBank className="size-3 text-violet-600" /></Link> : <PiggyBank className="size-3 text-violet-600" />} />
      </div>

      <div className="grid gap-2.5 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2 transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-1 pt-2.5 px-3">
            <CardTitle className="text-xs font-medium">Evolución anual</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5">
            <div className="overflow-x-auto">
              <div className="relative min-w-[500px] pt-3 pb-5">
                <div className="absolute inset-x-0 top-0 bottom-6 pointer-events-none">
                  {[0, 33, 66, 100].map((p) => (
                    <div key={p} className="absolute left-0 right-0 border-t border-muted/30" style={{ bottom: `${p}%` }} />
                  ))}
                </div>
                <div className="flex gap-1.5 relative z-10">
                  {filteredYearly.length ? filteredYearly.map((m, idx) => {
                    const maxVal = Math.max(m.ingresos, m.gastos, m.presupuesto, Math.abs(m.balance), 1)
                    const h = 120
                    const dims = [
                      { v: m.ingresos, color: "bg-green-400" },
                      { v: m.gastos, color: "bg-red-400" },
                      { v: m.presupuesto, color: "bg-violet-400" },
                      { v: Math.abs(m.balance), color: m.balance >= 0 ? "bg-blue-400" : "bg-red-300" },
                    ]
                    const monthName = new Date(m.month + "-01").toLocaleDateString("es-CO", { month: "short" }).replace(".", "")
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-px">
                        <div className="flex gap-px items-end rounded-md bg-muted/15 px-1" style={{ height: h }}>
                          {dims.map((d, i) => {
                            const pct = Math.max(2, (d.v / maxVal) * h)
                            return (
                              <div key={i} className="flex flex-col items-center justify-end" style={{ height: h }}>
                                <span className="text-[5px] text-muted-foreground/40 leading-none mb-px font-mono">{compact(d.v)}</span>
                                <div className={`w-1.5 rounded-full ${d.color} transition-all duration-300`} style={{ height: `${pct}px` }} />
                              </div>
                            )
                          })}
                        </div>
                        <span className={`text-[9px] font-medium ${idx % 2 === 0 ? "text-foreground" : "text-muted-foreground"}`}>{monthName}</span>
                      </div>
                    )
                  }) : (
                    <div className="flex items-center justify-center w-full py-8 text-xs text-muted-foreground">Sin datos para el período seleccionado</div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-center text-[10px] text-muted-foreground border-t pt-1.5">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-green-400" /> Ingresos</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-400" /> Gastos</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-violet-400" /> Presupuesto</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-blue-400" /> Balance</span>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-1 pt-2.5 px-3">
            <CardTitle className="text-xs font-medium">Últimos movimientos</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5">
            {(!data?.recentIncomes.length && !data?.recentExpenses.length) ? (
              <p className="text-xs text-muted-foreground">Sin movimientos en este período</p>
            ) : (
              <ul className="space-y-px">
                {[...(data?.recentIncomes.map(i => ({ ...i, _tipo: "ingreso" as const })) ?? []),
                   ...(data?.recentExpenses.map(e => ({ ...e, _tipo: "gasto" as const })) ?? [])
                ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 8)
                  .map((mov) => (
                    <li key={`${mov._tipo}-${mov.id}`} className="flex justify-between text-xs p-1 rounded hover:bg-muted/30 transition-colors">
                      <span className="truncate min-w-0 mr-1">
                        {mov.description || "Sin concepto"}
                        <span className="text-muted-foreground ml-1">· {mov.people?.name}</span>
                      </span>
                      <span className="text-[9px] text-muted-foreground shrink-0 mr-1">{new Date(mov.date).toLocaleDateString("es-CO")}</span>
                      <span className={`font-semibold shrink-0 ${mov._tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}>
                        {mov._tipo === "ingreso" ? "+" : "-"}{fmt(mov.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {data && data.totalBudgeted > 0 && (
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2 bg-muted/10">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Presupuesto:</span>
            <span className="text-violet-600 font-semibold">{fmt(data.totalBudgeted)}</span>
            <span className="text-red-600">-{fmt(data.totalGastos)}</span>
            <span className="text-green-600">={fmt(Math.max(0, data.totalBudgeted - data.totalGastos))}</span>
          </div>
          <div className="flex-1 max-w-[200px]">
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all ${data.totalGastos > data.totalBudgeted ? "bg-red-500" : data.totalGastos / data.totalBudgeted > 0.8 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, (data.totalGastos / data.totalBudgeted) * 100)}%` }} />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">{Math.round((data.totalGastos / data.totalBudgeted) * 100)}% gastado</span>
        </div>
      )}
    </div>
  )
}

function StatBadge({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 bg-background">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-xs font-bold tabular-nums ${color}`}>{value}</p>
      {icon && <div className="ml-auto">{icon}</div>}
    </div>
  )
}

function compact(n: number) {
  const v = Math.round(n * 100) / 100
  if (v >= 1_000_000) { const d = v / 1_000_000; return `${Number.isInteger(d) ? d : d.toFixed(1)}M` }
  if (v >= 1_000) { const d = v / 1_000; return `${Number.isInteger(d) ? d : d.toFixed(1)}k` }
  if (v > 0) return `${Math.round(v)}`
  return ""
}