"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { getDashboardData, getMonthlyBudgets, getYearlyData } from "@/lib/db"
import type { YearlyMonth } from "@/lib/db"
import type { Income, Expense, Person } from "@/types"
import { PiggyBank, Wallet, TrendingDown, TrendingUp, MoreHorizontal, ClipboardList } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { useMonthFilter } from "@/components/MonthFilterContext"
import { Tooltip } from "@/components/ui/tooltip"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js"
import { Line } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend, Filler)

type RecentIncome = Income & { people: Pick<Person, "name"> | null }
type RecentExpense = Expense & { people: Pick<Person, "name"> | null }

type DashboardData = {
  totalIngresos: number
  totalGastos: number
  totalBudgeted: number
  totalGastosSinRubro: number
  balance: number
  recentIncomes: RecentIncome[]
  recentExpenses: RecentExpense[]
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

  useEffect(() => { void (async () => { await load(months) })() }, [months, load])

  const cashflowChartData = useMemo(() => {
    if (!filteredYearly.length) return null
    return {
      labels: filteredYearly.map((m) =>
        new Date(m.month + "-01").toLocaleDateString("es-CO", { month: "short" }).replace(".", "")
      ),
      datasets: [
        {
          label: "Ingresos",
          data: filteredYearly.map((m) => m.ingresos),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 3,
        },
        {
          label: "Gastos",
          data: filteredYearly.map((m) => m.gastos),
          borderColor: "#f43f5e",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 3,
        },
      ],
    }
  }, [filteredYearly])

  const cashflowOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const, align: "end" as const, labels: { usePointStyle: true, boxWidth: 8 } },
    },
    scales: {
      y: { beginAtZero: true, grid: { borderDash: [2, 4], color: "#f1f5f9" }, border: { display: false } },
      x: { grid: { display: false }, border: { display: false } },
    },
  }

  const spentPct = data && data.totalBudgeted > 0 ? Math.min(100, (data.totalGastos / data.totalBudgeted) * 100) : 0

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  return (
    <div className="space-y-4">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Tooltip content="Presupuesto restante del período: presupuesto inicial − gastos" className="h-full">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Presupuesto</p>
                <h3 className="text-xl font-bold text-indigo-600">{fmt((data?.totalBudgeted ?? 0) - (data?.totalGastos ?? 0))}</h3>
                <p className="text-[10px] text-slate-500 mt-1">Presupuesto inicial: {fmt(data?.totalBudgeted ?? 0)}</p>
              </div>
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                <ClipboardList className="size-4" />
              </div>
            </div>
            {monthlyBudgetId && (
              <div className="mt-2 flex items-center">
                <Link href={`/presupuestos/${monthlyBudgetId}`} className="text-indigo-600 hover:underline text-[10px] font-medium">
                  Ver detalle
                </Link>
              </div>
            )}
          </div>
        </Tooltip>

        <Tooltip content="Dinero disponible en cuenta: ingreso inicial − presupuesto inicial − gastos asumidos del disponible" className="h-full">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Disponible para gastar</p>
                <h3 className="text-xl font-bold text-emerald-600">{fmt((data?.totalIngresos ?? 0) - (data?.totalBudgeted ?? 0) - (data?.totalGastosSinRubro ?? 0))}</h3>
                <p className="text-[10px] text-slate-500 mt-1">Ingreso inicial: {fmt(data?.totalIngresos ?? 0)}</p>
              </div>
              <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                <TrendingDown className="size-4" />
              </div>
            </div>
          </div>
        </Tooltip>

        <Tooltip content="Total gastado en el período (barra: % del presupuesto usado)" className="h-full">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{d.gastos}</p>
                <h3 className="text-xl font-bold text-rose-600">{fmt(data?.totalGastos ?? 0)}</h3>
              </div>
              <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
                <TrendingUp className="size-4" />
              </div>
            </div>
            {data && data.totalBudgeted > 0 && (
              <div className="mt-2 w-full bg-slate-100 rounded-full h-0.5">
                <div
                  className={`h-1 rounded-full ${spentPct > 100 ? "bg-rose-500" : spentPct > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${spentPct}%` }}
                />
              </div>
            )}
          </div>
        </Tooltip>

        <Tooltip content="Saldo en cuenta ingresos iniciales − gastos" className="h-full">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Saldo real en cuenta a la fecha</p>
                <h3 className={`text-xl font-bold ${(data?.balance ?? 0) >= 0 ? "text-slate-800" : "text-rose-600"}`}>{fmt(data?.balance ?? 0)}</h3>
              </div>
              <div className={`p-1.5 rounded-lg ${(data?.balance ?? 0) >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-600"}`}>
                <Wallet className="size-4" />
              </div>
            </div>
          </div>
        </Tooltip>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Flujo de Caja Mensual</h3>
            <button className="text-slate-400 hover:text-indigo-600 transition-colors">
              <MoreHorizontal className="size-4" />
            </button>
          </div>
          <div className="relative h-64">
            {cashflowChartData ? (
              <Line data={cashflowChartData} options={cashflowOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Sin datos para el período seleccionado
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-3">Gastos por Categoría</h3>
          <div className="relative h-64 flex justify-center items-center">
            {/* TODO: Falta dato dinámico para desglose de gastos por categoría */}
            <div className="text-sm text-slate-400 text-center">
              <PiggyBank className="size-8 mx-auto mb-2 text-slate-300" />
              <p>Datos no disponibles</p>
              <p className="text-xs text-slate-400 mt-1">Próximamente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Últimos movimientos</h3>
        {(!data?.recentIncomes.length && !data?.recentExpenses.length) ? (
          <p className="text-xs text-slate-500">Sin movimientos en este período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th scope="col" className="px-3 py-2 text-left text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>
                  <th scope="col" className="px-3 py-2 text-left text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Persona</th>
                  <th scope="col" className="px-3 py-2 text-right text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Monto</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {[...(data?.recentIncomes.map(i => ({ ...i, _tipo: "ingreso" as const })) ?? []),
                   ...(data?.recentExpenses.map(e => ({ ...e, _tipo: "gasto" as const })) ?? [])
                 ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 8)
                  .map((mov) => (
                    <tr key={`${mov._tipo}-${mov.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap text-[10px] text-slate-500">
                        {new Date(mov.date).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center ${mov._tipo === "ingreso" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                            {mov._tipo === "ingreso" ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
                          </div>
                          <div className="ml-2">
                            <div className="text-[10px] font-medium text-slate-900">{mov.description || "Sin concepto"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-[10px] text-slate-500">{mov.people?.name}</td>
                      <td className={`px-3 py-2 whitespace-nowrap text-right text-[10px] font-semibold ${mov._tipo === "ingreso" ? "text-emerald-600" : "text-rose-600"}`}>
                        {mov._tipo === "ingreso" ? "+" : "-"}{fmt(mov.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}