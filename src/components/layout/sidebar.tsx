"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Users, Wallet, PiggyBank, BookOpen, Palette, PanelLeftClose, PanelLeft } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

const links = [
  { href: "/", key: "dashboard" as const, icon: LayoutDashboard },
  { href: "/presupuestos", key: "presupuestos" as const, icon: PiggyBank },
  { href: "/ingresos", key: "ingresos" as const, icon: ArrowDownCircle },
  { href: "/gastos", key: "gastos" as const, icon: ArrowUpCircle },
  { href: "/personas", key: "personas" as const, icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const nav = t.nav
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <aside className="w-10 border-r bg-sidebar flex flex-col shrink-0 items-center pt-3">
        <button onClick={() => setCollapsed(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <PanelLeft className="size-4" />
        </button>
      </aside>
    )
  }

  return (
    <aside className="w-56 border-r bg-sidebar flex flex-col shrink-0">
      <div className="p-5 border-b bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground">
              <Wallet className="size-4" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">{t.app.name}</h1>
          </div>
          <button onClick={() => setCollapsed(true)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors -mr-1">
            <PanelLeftClose className="size-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground ml-10">{t.app.tagline}</p>
      </div>

      <nav className="p-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-0.5"
              )}
            >
              <Icon className={cn("size-4", isActive && "text-primary")} />
              {nav[link.key]}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 space-y-1">
        <div className="h-px bg-border" />
        <Link
          href="/personalizacion"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            pathname === "/personalizacion"
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-0.5"
          )}
        >
          <Palette className={cn("size-4", pathname === "/personalizacion" && "text-primary")} />
          {nav.personalizacion}
        </Link>
      </div>

      <div className="flex-1" />

      <div className="px-3 pb-3 space-y-1">
        <div className="h-px bg-border" />
        <Link
          href="/guia"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            pathname === "/guia"
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-0.5"
          )}
        >
          <BookOpen className={cn("size-4", pathname === "/guia" && "text-primary")} />
          {nav.guia}
        </Link>
      </div>

      <div className="p-4 border-t text-[10px] text-muted-foreground text-center">
        {t.app.version}
      </div>
    </aside>
  )
}
