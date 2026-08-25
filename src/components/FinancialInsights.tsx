"use client"

import { useEffect, useState, useRef } from "react"
import { getFinancialInsights, type FinancialInsight, type ChronicOverspendCategory } from "@/lib/db"
import { useLanguage } from "@/i18n/useLanguage"
import { TrendingDown, PiggyBank, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"

function InsightCard({ insight, fmt }: { insight: FinancialInsight; fmt: (n: number) => string }) {
  if (insight.type === "income_drop") {
    return (
      <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-start gap-3">
        <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600 shrink-0">
          <TrendingDown className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-rose-600">Ingresos bajaron</p>
          <p className="text-xs font-semibold text-slate-800">
            Ingresaste {fmt(insight.currentAmount)} este mes, menos que los {fmt(insight.previousAmount)} del mes pasado
          </p>
          <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 mt-1">
            -{insight.dropPercent}% menos
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
          <p className="text-[10px] font-medium text-amber-600">Ahorro bajo</p>
          <p className="text-xs font-semibold text-slate-800">
            Solo ahorrás el {insight.rate}% de lo que ingresás
          </p>
          <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 mt-1">
            Ahorraste {fmt(insight.totalDeposits)} de {fmt(insight.totalIncome)} ingresados
          </span>
        </div>
      </div>
    )
  }

  if (insight.type === "chronic_overspend") {
    return <OverspendCarousel categories={insight.categories} fmt={fmt} />
  }

  return null
}

function OverspendCarousel({ categories, fmt }: { categories: ChronicOverspendCategory[]; fmt: (n: number) => string }) {
  const [current, setCurrent] = useState(0)

  const prev = () => setCurrent((c) => (c - 1 + categories.length) % categories.length)
  const next = () => setCurrent((c) => (c + 1) % categories.length)
  const cat = categories[current]

  return (
    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-red-50 rounded-lg text-red-600 shrink-0">
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-red-600">Presupuesto superado</p>
          <p className="text-xs font-semibold text-slate-800">
            La categoría <strong>{cat.categoryName}</strong> se pasó {fmt(cat.currentExcess)} este mes ({fmt(cat.currentExcess + cat.budgeted)} de {fmt(cat.budgeted)})
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full ${cat.previousExcess === null ? "bg-slate-50 text-slate-500" : cat.currentExcess > cat.previousExcess ? "bg-red-50 text-red-600" : cat.currentExcess < cat.previousExcess ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"}`}>
              {cat.previousExcess === null
                ? "No tenía exceso el mes pasado"
                : cat.currentExcess > cat.previousExcess
                  ? `▲ Empeoró vs mes anterior (+${fmt(cat.currentExcess - cat.previousExcess)})`
                  : cat.currentExcess < cat.previousExcess
                    ? `▼ Mejoró vs mes anterior (-${fmt(cat.previousExcess - cat.currentExcess)})`
                    : "Igual que el mes pasado"}
            </span>
          </div>
        </div>
        {categories.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prev} className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="text-[9px] text-slate-400 tabular-nums">{current + 1}/{categories.length}</span>
            <button onClick={next} className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
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
