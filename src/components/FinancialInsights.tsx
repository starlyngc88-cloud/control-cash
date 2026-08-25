"use client"

import { useEffect, useState } from "react"
import { getFinancialInsights, type FinancialInsight } from "@/lib/db"
import { useLanguage } from "@/i18n/useLanguage"
import { TrendingDown, PiggyBank, AlertTriangle } from "lucide-react"

function InsightCard({ insight, fmt }: { insight: FinancialInsight; fmt: (n: number) => string }) {
  if (insight.type === "income_drop") {
    return (
      <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-start gap-3">
        <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600 shrink-0">
          <TrendingDown className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-slate-500">Ingresos bajaron</p>
          <p className="text-xs font-semibold text-slate-800">
            {fmt(insight.currentAmount)} este mes vs {fmt(insight.previousAmount)} el anterior
          </p>
          <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 mt-1">
            -{insight.dropPercent}%
          </span>
        </div>
      </div>
    )
  }

  if (insight.type === "low_savings_rate") {
    return (
      <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-start gap-3">
        <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600 shrink-0">
          <PiggyBank className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-slate-500">Tasa de ahorro baja</p>
          <p className="text-xs font-semibold text-slate-800">
            Solo ahorras el {insight.rate}% de tus ingresos
          </p>
          <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 mt-1">
            {fmt(insight.totalDeposits)} / {fmt(insight.totalIncome)}
          </span>
        </div>
      </div>
    )
  }

  if (insight.type === "chronic_overspend") {
    return (
      <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-start gap-3">
        <div className="p-1.5 bg-red-50 rounded-lg text-red-600 shrink-0">
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-slate-500">Presupuesto superado</p>
          <p className="text-xs font-semibold text-slate-800">
            {insight.categoryName} superó el presupuesto en {insight.timesOverBudget} de {insight.totalMonths} meses
          </p>
          <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 mt-1">
            +{fmt(insight.totalExcess)} exceso
          </span>
        </div>
      </div>
    )
  }

  return null
}

export function FinancialInsights() {
  const [insights, setInsights] = useState<FinancialInsight[]>([])
  const [loading, setLoading] = useState(true)
  const { fmt } = useLanguage()

  useEffect(() => {
    let active = true
    getFinancialInsights()
      .then((data) => { if (active) setInsights(data) })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading || insights.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Alertas financieras</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((insight, i) => (
          <InsightCard key={`${insight.type}-${i}`} insight={insight} fmt={fmt} />
        ))}
      </div>
    </div>
  )
}
