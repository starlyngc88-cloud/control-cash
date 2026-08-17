"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { getDashboardData, getMonthlyBudgets, getCashflowData, getCategoryCashflowData, type CategoryCashflowItem } from "@/lib/db"
import type { CashflowPoint } from "@/lib/db"
import type { Income, Expense, Person } from "@/types"
import { Wallet, TrendingDown, TrendingUp, ClipboardList } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { useCashflowFilter, autoGranularity, granularityLabel } from "@/components/contexts/CashflowFilterContext"
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
  type TooltipItem,
} from "chart.js"
import { Line } from "react-chartjs-2"

import { CategoryMultiSelect } from "@/components/CategoryMultiSelect"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend, Filler)

type RecentIncome = Income & { people: Pick<Person, "name"> | null }
type RecentExpense = Expense & { people: Pick<Person, "name"> | null }

type DashboardData = {
  totalIngresos: number
  totalGastos: number
  totalGastosConRubro: number
  totalBudgeted: number
  totalGastosSinRubro: number
  balance: number
  recentIncomes: RecentIncome[]
  recentExpenses: RecentExpense[]
}

const pad2 = (n: number) => String(n).padStart(2, "0")

const PALETTE = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#0ea5e9", "#a855f7", "#84cc16", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#22c55e"]

function monthsBetween(startDate: string, endDate: string): string[] {
  const months: string[] = []
  const start = new Date(startDate + "T00:00:00")
  const end = new Date(endDate + "T00:00:00")
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`)
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months
}

export default function DashboardPage() {
  const { startDate, endDate } = useCashflowFilter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [monthlyBudgetId, setMonthlyBudgetId] = useState<string | null>(null)
  const [cashflowData, setCashflowData] = useState<CashflowPoint[]>([])
  const [categoryItems, setCategoryItems] = useState<CategoryCashflowItem[]>([])
  const [categoryLabels, setCategoryLabels] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const { t, fmt } = useLanguage()
  const d = t.dashboard

  const months = useMemo(() => monthsBetween(startDate, endDate), [startDate, endDate])
  const granularity = autoGranularity(startDate, endDate)

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

  useEffect(() => { void (async () => { await load(months) })() }, [months, load])

  useEffect(() => {
    getCashflowData(startDate, endDate, granularity).then(setCashflowData).catch(() => setCashflowData([]))
  }, [startDate, endDate, granularity])

  useEffect(() => {
    getCategoryCashflowData(startDate, endDate, granularity)
      .then((d) => { setCategoryItems(d.items); setCategoryLabels(d.labels) })
      .catch(() => { setCategoryItems([]); setCategoryLabels([]) })
  }, [startDate, endDate, granularity])

  const cashflowChartData = useMemo(() => {
    if (!cashflowData.length) return null
    return {
      labels: cashflowData.map((p) => p.label),
      datasets: [
        {
          label: "Ingresos",
          data: cashflowData.map((p) => p.ingresos),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 3,
        },
        {
          label: "Gastos",
          data: cashflowData.map((p) => p.gastos),
          borderColor: "#f43f5e",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 3,
        },
      ],
    }
  }, [cashflowData])

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

  const categoryChartData = useMemo(() => {
    if (!categoryItems.length || !categoryLabels.length) return null
    const showAll = selectedCategories === null
    const visible = categoryItems.filter((item) => showAll || selectedCategories.includes(item.name))
    if (!visible.length) return null
    return {
      labels: categoryLabels,
      datasets: visible.map((item, i) => ({
        label: item.name,
        data: item.points.map((p) => p.gastos),
        borderColor: PALETTE[i % PALETTE.length],
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 2.5,
      })),
    }
  }, [categoryItems, categoryLabels, selectedCategories])

  const categoryOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"line">) => `${ctx.dataset.label ?? ""}: ${ctx.parsed.y === null ? "0" : fmt(ctx.parsed.y)}`,
        },
      },
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
        <Tooltip content="Presupuesto restante del período: presupuesto inicial − gastos del presupuesto" className="h-full">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Presupuesto</p>
                <h3 className="text-xl font-bold text-indigo-600">{fmt((data?.totalBudgeted ?? 0) - (data?.totalGastosConRubro ?? 0))}</h3>
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Gastos por Categoría</h3>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-indigo-50 text-indigo-600 rounded-full">
                Vista: {granularityLabel(granularity)}
              </span>
              {categoryItems.length > 0 && (
                <CategoryMultiSelect
                  items={categoryItems.map((i) => i.name)}
                  value={selectedCategories}
                  onChange={setSelectedCategories}
                />
              )}
            </div>
          </div>
          <div className="relative h-64">
            {categoryChartData ? (
              <Line data={categoryChartData} options={categoryOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Sin datos para el período seleccionado
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Flujo de Caja</h3>
            <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-indigo-50 text-indigo-600 rounded-full">
              Vista: {granularityLabel(granularity)}
            </span>
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