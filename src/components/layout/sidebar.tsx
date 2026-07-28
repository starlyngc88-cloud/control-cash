"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Wallet, PanelLeftClose, PanelLeft, LogOut, ChevronDown } from "lucide-react"
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
  { href: "/ingresos", key: "ingresos" as const },
  { href: "/gastos", key: "gastos" as const },
  { href: "/ahorros", key: "ahorros" as const },
  { href: "/compromisos", key: "compromisos" as const },
  { href: "/gastos-futuros", key: "gastosFuturos" as const },
]

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { signOut } = useAuth()
  const nav = t.nav
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(false)

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
    <aside className="w-56 border-r bg-sidebar flex flex-col shrink-0 h-screen overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-br from-primary/10 to-primary/5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
              <Wallet className="size-3.5" />
            </div>
            <h1 className="font-bold text-base tracking-tight">{t.app.name}</h1>
          </div>
          <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors -mr-1">
            <PanelLeftClose className="size-3.5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
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

        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              expanded || pathname === "/personalizacion" || pathname === "/personas"
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-0.5"
            )}
          >
            <span className="text-base shrink-0">{emojiMap.personalizacion}</span>
            <span className="flex-1 text-left">{nav.personalizacion}</span>
            <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-muted pl-2">
              <Link
                href="/personalizacion"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  pathname === "/personalizacion"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-0.5"
                )}
              >
                <span className="text-base shrink-0">{emojiMap.personalizacion}</span>
                <span>Personalización</span>
              </Link>
              <Link
                href="/personas"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  pathname === "/personas"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-0.5"
                )}
              >
                <span className="text-base shrink-0">{emojiMap.personas}</span>
                <span>{nav.personas}</span>
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="shrink-0 p-2 space-y-0.5 border-t">
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
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="size-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
