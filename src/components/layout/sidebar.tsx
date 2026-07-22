"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Users, Wallet, PiggyBank, BookOpen } from "lucide-react"

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/ingresos", label: "Ingresos", icon: ArrowDownCircle },
  { href: "/gastos", label: "Gastos", icon: ArrowUpCircle },
  { href: "/personas", label: "Personas", icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 border-r bg-sidebar flex flex-col shrink-0">
      <div className="p-5 border-b bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">KellyCash</h1>
        </div>
        <p className="text-xs text-muted-foreground ml-10">La platica bajo control</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
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
              {link.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 pb-1">
        <div className="h-px bg-border mb-1" />
        {(() => {
          const isGuideActive = pathname === "/guia"
          return (
            <Link
              href="/guia"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isGuideActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-0.5"
              )}
            >
              <BookOpen className={cn("size-4", isGuideActive && "text-primary")} />
              Guía
            </Link>
          )
        })()}
      </div>
      <div className="p-4 border-t text-[10px] text-muted-foreground text-center">
        KellyCash v1.0
      </div>
    </aside>
  )
}
