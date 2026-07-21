"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardData } from "@/lib/db"
import { ArrowDownCircle, ArrowUpCircle, LayoutDashboard, Wallet } from "lucide-react"

type DashboardData = {
  totalIngresos: number
  totalGastos: number
  balance: number
  recentIncomes: any[]
  recentExpenses: any[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-muted-foreground">Cargando...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
          <LayoutDashboard className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Resumen del mes</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
              <ArrowDownCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ${Number(data?.totalIngresos ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
              <ArrowUpCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              ${Number(data?.totalGastos ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                (data?.balance ?? 0) >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ${Number(data?.balance ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Últimos ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentIncomes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ingresos registrados</p>
            ) : (
              <ul className="space-y-2">
                {data?.recentIncomes.map((inc: any) => (
                  <li key={inc.id} className="flex justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <span>
                      {inc.description}{" "}
                      <span className="text-muted-foreground">· {inc.people?.name}</span>
                    </span>
                    <span className="font-semibold text-green-600">
                      +${Number(inc.amount).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Últimos gastos</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin gastos registrados</p>
            ) : (
              <ul className="space-y-2">
                {data?.recentExpenses.map((exp: any) => (
                  <li key={exp.id} className="flex justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <span>
                      {exp.description}{" "}
                      <span className="text-muted-foreground">· {exp.people?.name}</span>
                    </span>
                    <span className="font-semibold text-red-600">
                      -${Number(exp.amount).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
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
