"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Wallet, PanelLeftClose, PanelLeft, LogOut, ChevronDown,
  LayoutDashboard, TrendingDown, TrendingUp, Calendar, Handshake,
  PiggyBank, Settings, BookOpen, Users
} from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { useAuth } from "@/components/auth/AuthProvider"

const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
  dashboard: { icon: LayoutDashboard, color: "text-indigo-400" },
  presupuestos: { icon: Calendar, color: "text-violet-400" },
  ingresos: { icon: TrendingDown, color: "text-emerald-400" },
  gastos: { icon: TrendingUp, color: "text-rose-400" },
  ahorros: { icon: PiggyBank, color: "text-pink-400" },
  gastosFuturos: { icon: Calendar, color: "text-orange-400" },
  compromisos: { icon: Handshake, color: "text-blue-400" },
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
  const { signOut, user } = useAuth()
  const nav = t.nav
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (pathname === "/login") return null

  if (collapsed) {
    return (
      <aside className="w-16 bg-[#0f172a] flex flex-col shrink-0 items-center pt-4 border-r border-slate-800">
        <button onClick={() => setCollapsed(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <PanelLeft className="size-5" />
        </button>
        <nav className="flex flex-col items-center gap-3 mt-8">
          {links.map((link) => {
            const Icon = iconMap[link.key]?.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isActive ? "bg-indigo-500/10 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
                title={nav[link.key]}
              >
                {Icon && <Icon className="size-5" />}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto mb-4">
          <button onClick={signOut} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Cerrar sesión">
            <LogOut className="size-5" />
          </button>
        </div>
      </aside>
    )
  }

  const userName = user?.email?.split("@")[0] ?? "Usuario"
  const userInitials = userName.substring(0, 2).toUpperCase()

  return (
    <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shrink-0 h-screen overflow-hidden transition-all duration-300">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-center size-9 rounded-lg bg-indigo-500/20 text-indigo-400">
          <Wallet className="size-5" />
        </div>
        <span className="text-white font-bold text-xl tracking-wide ml-3">{t.app.name}</span>
        <button onClick={() => setCollapsed(true)} className="ml-auto p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {links.map((link) => {
          const isActive = pathname === link.href
          const iconData = iconMap[link.key]
          const Icon = iconData?.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-500/10 text-white border-r-2 border-indigo-500"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              {Icon && <Icon className={cn("size-5 shrink-0 mr-3", iconData?.color)} />}
              <span>{nav[link.key]}</span>
            </Link>
          )
        })}

        {/* Personalización submenu */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex w-full items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              expanded || pathname === "/personalizacion" || pathname === "/personas"
                ? "bg-indigo-500/10 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Settings className="size-5 shrink-0 mr-3 text-slate-400" />
            <span className="flex-1 text-left">{nav.personalizacion}</span>
            <ChevronDown className={cn("size-4 text-slate-500 transition-transform", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-700 pl-3">
              <Link
                href="/personalizacion"
                className={cn(
                  "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === "/personalizacion"
                    ? "bg-indigo-500/10 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Settings className="size-4 shrink-0 mr-3 text-slate-400" />
                <span>Personalización</span>
              </Link>
              <Link
                href="/personas"
                className={cn(
                  "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === "/personas"
                    ? "bg-indigo-500/10 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Users className="size-4 shrink-0 mr-3 text-slate-400" />
                <span>{nav.personas}</span>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 p-4 border-t border-slate-800 space-y-1">
        <Link
          href="/guia"
          className={cn(
            "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            pathname === "/guia"
              ? "bg-indigo-500/10 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          <BookOpen className="size-5 shrink-0 mr-3 text-slate-400" />
          <span>{nav.guia}</span>
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="size-5 shrink-0 mr-3" />
          <span>Cerrar sesión</span>
        </button>

        {/* User profile */}
        <div className="mt-4 flex items-center px-3 pt-3 border-t border-slate-800">
          <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userInitials}
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email ?? ""}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
