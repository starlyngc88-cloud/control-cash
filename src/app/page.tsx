"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardData, getMonthlyBudgets } from "@/lib/db"
import { ArrowDownCircle, ArrowUpCircle, LayoutDashboard, Wallet, PiggyBank } from "lucide-react"
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
  const [loading, setLoading] = useState(true)
  const { t, fmt } = useLanguage()
  const d = t.dashboard

  const load = useCallback(async (m: string[]) => {
    setLoading(true)
    try {
      const [res, budgets] = await Promise.all([getDashboardData(m), getMonthlyBudgets()])
      setData(res)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/30">
            <LayoutDashboard className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{d.title}</h2>
            <p className="text-sm text-muted-foreground">{d.subtitle}</p>
          </div>
        </div>
        <DateFilter />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Ingresos y Gastos" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos / Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-600 font-medium">{d.ingresos}</span>
                  <span className="text-green-600 font-bold tabular-nums">{fmt(data?.totalIngresos ?? 0)}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${Math.min(100, ((data?.totalIngresos ?? 0) / Math.max(data?.totalIngresos ?? 1, data?.totalGastos ?? 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-600 font-medium">{d.gastos}</span>
                  <span className="text-red-600 font-bold tabular-nums">{fmt(data?.totalGastos ?? 0)}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{ width: `${Math.min(100, ((data?.totalGastos ?? 0) / Math.max(data?.totalIngresos ?? 1, data?.totalGastos ?? 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card title="Diferencia entre ingresos y gastos" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{d.balance}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${(data?.balance ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmt(data?.balance ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card title="Presupuesto mensual y progreso" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
            {monthlyBudgetId ? (
              <Link href={`/presupuestos/${monthlyBudgetId}`} className="flex items-center justify-center size-8 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-800/40 transition-colors">
                <PiggyBank className="size-4" />
              </Link>
            ) : (
              <div className="flex items-center justify-center size-8 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30">
                <PiggyBank className="size-4" />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-violet-600">{fmt(data?.totalBudgeted ?? 0)}</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">presupuestado</p>
            {data && data.totalBudgeted > 0 && (
              <div className="mt-1.5">
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-red-600">-{fmt(data.totalGastos)}</span>
                  <span className="text-green-600">={fmt(Math.max(0, data.totalBudgeted - data.totalGastos))}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      data.totalGastos > data.totalBudgeted
                        ? "bg-red-500"
                        : data.totalGastos / data.totalBudgeted > 0.8
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(100, (data.totalGastos / data.totalBudgeted) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {Math.round((data.totalGastos / data.totalBudgeted) * 100)}% gastado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Últimos movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            {(!data?.recentIncomes.length && !data?.recentExpenses.length) ? (
              <p className="text-sm text-muted-foreground">Sin movimientos en este período</p>
            ) : (
              <ul className="space-y-1">
                {[...(data?.recentIncomes.map(i => ({ ...i, _tipo: "ingreso" as const })) ?? []),
                   ...(data?.recentExpenses.map(e => ({ ...e, _tipo: "gasto" as const })) ?? [])
                ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((mov) => (
                    <li key={`${mov._tipo}-${mov.id}`} className="flex justify-between text-sm p-1.5 rounded hover:bg-muted/30 transition-colors">
                      <span>
                        {mov.description || "Sin concepto"}{" "}
                        <span className="text-muted-foreground">· {mov.people?.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">· {new Date(mov.date).toLocaleDateString("es-CO")}</span>
                      </span>
                      <span className={`font-semibold ${mov._tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}>
                        {mov._tipo === "ingreso" ? "+" : "-"}{fmt(mov.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
