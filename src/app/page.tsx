"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { MonthPicker } from "@/components/ui/month-picker"
import { getDashboardData } from "@/lib/db"
import { ArrowDownCircle, ArrowUpCircle, LayoutDashboard, Wallet, PiggyBank, Calendar } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

type DashboardData = {
  totalIngresos: number
  totalGastos: number
  totalBudgeted: number
  balance: number
  recentIncomes: any[]
  recentExpenses: any[]
}

export default function DashboardPage() {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  }
  const [month, setMonth] = useState(defaultMonth)
  const [openCal, setOpenCal] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { t, fmt } = useLanguage()
  const d = t.dashboard

  const load = useCallback(async (m: string) => {
    setLoading(true)
    try {
      const res = await getDashboardData(m)
      setData(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(month) }, [month, load])

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{d.title}</h2>
            <p className="text-sm text-muted-foreground">{d.subtitle}</p>
          </div>
        </div>
        <Dialog open={openCal} onOpenChange={setOpenCal}>
          <DialogTrigger render={<button type="button" className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs bg-background shadow-xs hover:bg-muted/50 cursor-pointer transition-colors" />}>
            <Calendar className="size-3.5 text-muted-foreground shrink-0" />
            <span className="tabular-nums font-medium">{month ? formatMonth(month) : "Seleccionar"}</span>
          </DialogTrigger>
          <DialogContent className="max-w-64">
            <MonthPicker value={month} onChange={(v) => { setMonth(v); setOpenCal(false) }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{d.ingresos}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
              <ArrowDownCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{fmt(data?.totalIngresos ?? 0)}</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{d.gastos}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
              <ArrowUpCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{fmt(data?.totalGastos ?? 0)}</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
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

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30">
              <PiggyBank className="size-4" />
            </div>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{d.ultimosIngresos}</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentIncomes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{d.sinIngresos}</p>
            ) : (
              <ul className="space-y-2">
                {data?.recentIncomes.map((inc: any) => (
                  <li key={inc.id} className="flex justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <span>
                      {inc.description}{" "}
                      <span className="text-muted-foreground">· {inc.people?.name}</span>
                    </span>
                    <span className="font-semibold text-green-600">+{fmt(inc.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{d.ultimosGastos}</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{d.sinGastos}</p>
            ) : (
              <ul className="space-y-2">
                {data?.recentExpenses.map((exp: any) => (
                  <li key={exp.id} className="flex justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <span>
                      {exp.description}{" "}
                      <span className="text-muted-foreground">· {exp.people?.name}</span>
                    </span>
                    <span className="font-semibold text-red-600">-{fmt(exp.amount)}</span>
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
