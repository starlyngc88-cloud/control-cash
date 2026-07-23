"use client"

import Link from "next/link"
import { ArrowRight, ArrowDownCircle, ArrowUpCircle, Users, PiggyBank, Target, CheckCircle2, Wallet, BookOpen, Goal, Crosshair, ShieldCheck, Settings2 } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function GuiaPage() {
  const { t } = useLanguage()
  const g = t.guia

  const steps = [
    {
      id: 1,
      titleKey: "step1Title" as const,
      descKey: "step1Desc" as const,
      icon: Users,
      href: "/personas",
      color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
      iconColor: "text-blue-500",
    },
    {
      id: 2,
      titleKey: "step2Title" as const,
      descKey: "step2Desc" as const,
      icon: PiggyBank,
      href: "/presupuestos",
      color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
      iconColor: "text-emerald-500",
    },
    {
      id: 3,
      titleKey: "step3Title" as const,
      descKey: "step3Desc" as const,
      icon: Target,
      href: "/presupuestos",
      color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
      iconColor: "text-violet-500",
    },
    {
      id: 4,
      titleKey: "step4Title" as const,
      descKey: "step4Desc" as const,
      icon: Wallet,
      href: "/gastos",
      color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
      iconColor: "text-amber-500",
      extraLinks: [
        { labelKey: "irAIngresos" as const, href: "/ingresos", icon: ArrowDownCircle },
        { labelKey: "irAGastos" as const, href: "/gastos", icon: ArrowUpCircle },
      ],
    },
    {
      id: 5,
      titleKey: "step5Title" as const,
      descKey: "step5Desc" as const,
      icon: CheckCircle2,
      href: "/",
      color: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
      iconColor: "text-rose-500",
    },
    {
      id: 6,
      titleKey: "step6Title" as const,
      descKey: "step6Desc" as const,
      icon: Goal,
      href: "/ahorros",
      color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
      iconColor: "text-amber-500",
      extraLinks: [
        { labelKey: "irAAhorros" as const, href: "/ahorros", icon: Goal },
      ],
    },
    {
      id: 7,
      titleKey: "step7Title" as const,
      descKey: "step7Desc" as const,
      icon: Crosshair,
      href: "/gastos-futuros",
      color: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
      iconColor: "text-orange-500",
      extraLinks: [
        { labelKey: "irAGastosFuturos" as const, href: "/gastos-futuros", icon: Crosshair },
      ],
    },
    {
      id: 8,
      titleKey: "step8Title" as const,
      descKey: "step8Desc" as const,
      icon: ShieldCheck,
      href: "/compromisos",
      color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
      iconColor: "text-indigo-500",
      extraLinks: [
        { labelKey: "irACompromisos" as const, href: "/compromisos", icon: ShieldCheck },
      ],
    },
    {
      id: 9,
      titleKey: "step9Title" as const,
      descKey: "step9Desc" as const,
      icon: Settings2,
      href: "/personalizacion",
      color: "from-slate-500/20 to-slate-600/10 border-slate-500/30",
      iconColor: "text-slate-500",
      extraLinks: [
        { labelKey: "irAPersonalizacion" as const, href: "/personalizacion", icon: Settings2 },
      ],
    },
  ]

  return (
    <div className="max-w-3xl mx-auto py-4 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center size-10 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30">
          <BookOpen className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{g.title}</h2>
          <p className="text-sm text-muted-foreground">{g.subtitle}</p>
        </div>
      </div>

      {/* Detailed steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div key={step.id} className={`rounded-xl border p-3 bg-gradient-to-br ${step.color}`}>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center size-7 rounded-full bg-background border shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold text-muted-foreground">{step.id}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`size-4 ${step.iconColor}`} />
                    <h2 className="text-sm font-semibold">{g[step.titleKey]}</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{g[step.descKey]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Link
                      href={step.href}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-background border hover:bg-accent transition-colors"
                    >
                      {g.irAPrefix} {g[step.titleKey].toLowerCase()}
                      <ArrowRight className="size-2.5" />
                    </Link>
                    {step.extraLinks?.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-background border hover:bg-accent transition-colors"
                      >
                        <link.icon className="size-2.5" />
                        {g[link.labelKey]}
                        <ArrowRight className="size-2.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tips footer */}
      <div className="mt-4 p-3 rounded-xl bg-muted/30 border">
        <h3 className="text-xs font-semibold mb-1.5">{g.consejos}</h3>
        <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
          <li>{g.tip1}</li>
          <li>{g.tip2}</li>
          <li>{g.tip3}</li>
          <li>{g.tip4}</li>
          <li>{g.tip5}</li>
        </ul>
      </div>
    </div>
  )
}
