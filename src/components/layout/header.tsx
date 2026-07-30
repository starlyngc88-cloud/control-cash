"use client"

import { usePathname } from "next/navigation"
import { useLanguage } from "@/i18n/useLanguage"
import { DateFilter } from "@/components/DateFilter"
import { useHeaderActions } from "@/components/HeaderActionsContext"

const pageTitleMap: Record<string, string> = {
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
  const titleKey = pageTitleMap[basePath] ?? pageTitleMap["/"]
  const title = (t as any)[titleKey]?.title ?? t.nav[titleKey as keyof typeof t.nav] ?? t.app.name
  const isDashboard = basePath === "/"

  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10 shadow-sm shrink-0">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>

      <div className={`flex-1 flex ${isDashboard ? "justify-center" : "justify-center"} ${actions ? "ml-0" : ""}`}>
        <DateFilter />
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  )
}
