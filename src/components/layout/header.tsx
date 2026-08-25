"use client"

import { usePathname } from "next/navigation"
import { useLanguage } from "@/i18n/useLanguage"
import { DateFilter } from "@/components/DateFilter"
import { CashflowRangeFilter } from "@/components/CashflowRangeFilter"
import { useHeaderActions } from "@/components/HeaderActionsContext"

type PageKey = "dashboard" | "presupuestos" | "ingresos" | "gastos" | "ahorros" | "compromisos" | "gastosFuturos" | "personalizacion" | "personas" | "guia"

const pageTitleMap: Record<string, PageKey> = {
  "/": "dashboard",
  "/presupuestos": "presupuestos",
  "/ingresos": "ingresos",
  "/gastos": "gastos",
  "/ahorros": "ahorros",
  "/compromisos": "compromisos",
  "/gastos-futuros": "gastosFuturos",
  "/personalizacion": "personalizacion",
  "/personas": "personas",
  "/guia": "guia",
}

export function Header() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { actions } = useHeaderActions()

  if (pathname === "/login") return null

  const basePath = "/" + (pathname.split("/")[1] ?? "")
  const titleKey: PageKey = pageTitleMap[basePath] ?? pageTitleMap["/"]
  const title = t[titleKey].title ?? t.nav[titleKey] ?? t.app.name
  const isDashboard = basePath === "/"
  const isBudgetDetail = basePath === "/presupuestos" && pathname.split("/").length > 2

  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10 shadow-sm shrink-0">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>

      {!isBudgetDetail && (
        <div className="flex-1 flex justify-center">
          <CashflowRangeFilter />
        </div>
      )}

      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  )
}
