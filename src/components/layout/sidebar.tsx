"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Wallet, PanelLeftClose, PanelLeft, LogOut } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { useAuth } from "@/components/auth/AuthProvider"

const emojiMap: Record<string, string> = {
  dashboard: "📊",
  presupuestos: "📋",
  ahorros: "🐷",
  gastosFuturos: "🎯",
  compromisos: "🔒",
  ingresos: "💰",
  gastos: "💸",
  personas: "👥",
  personalizacion: "⚙️",
  guia: "📖",
}

const links = [
  { href: "/", key: "dashboard" as const },
  { href: "/presupuestos", key: "presupuestos" as const },
  { href: "/ahorros", key: "ahorros" as const },
  { href: "/gastos-futuros", key: "gastosFuturos" as const },
  { href: "/compromisos", key: "compromisos" as const },
  { href: "/ingresos", key: "ingresos" as const },
  { href: "/gastos", key: "gastos" as const },
  { href: "/personas", key: "personas" as const },
]

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { user, signOut } = useAuth()
  const nav = t.nav
  const [collapsed, setCollapsed] = useState(false)

  if (pathname === "/login") return null

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
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
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
              <span className="text-base shrink-0">{emojiMap[link.key]}</span>
              <span>{nav[link.key]}</span>
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
          <span className="text-base shrink-0">{emojiMap.personalizacion}</span>
          <span>{nav.personalizacion}</span>
        </Link>
      </div>

      <div className="flex-1" />

      <div className="px-3 pb-3 space-y-1">
        {user && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b border-border mb-2">
            {user.email}
          </div>
        )}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="size-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
        <Link
          href="/guia"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            pathname === "/guia"
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-0.5"
          )}
        >
          <span className="text-base shrink-0">{emojiMap.guia}</span>
          <span>{nav.guia}</span>
        </Link>
      </div>

      <div className="p-4 border-t text-[10px] text-muted-foreground text-center">
        {t.app.version}
      </div>
    </aside>
  )
}
