"use client"

import Link from "next/link"
import { ArrowRight, ArrowDownCircle, ArrowUpCircle, Users, PiggyBank, Target, CheckCircle2, Wallet } from "lucide-react"

const steps = [
  {
    id: 1,
    title: "Crear personas",
    desc: "Registra a cada persona que administrará dinero en la app. Son los participantes del control compartido.",
    icon: Users,
    href: "/personas",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    iconColor: "text-blue-500",
  },
  {
    id: 2,
    title: "Crear plantilla de presupuesto",
    desc: "Define una plantilla con los rubros (categorías) en los que se gasta: Comida, Transporte, Servicios, etc. Esta plantilla será la base de cada mes.",
    icon: PiggyBank,
    href: "/presupuestos",
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    iconColor: "text-emerald-500",
  },
  {
    id: 3,
    title: "Generar un mes",
    desc: "Dentro de la plantilla, genera un mes financiero (ej: Agosto 2026). La app copia automáticamente los rubros con sus montos asignados para ese mes.",
    icon: Target,
    href: "/presupuestos",
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    iconColor: "text-violet-500",
  },
  {
    id: 4,
    title: "Agregar ingresos y gastos",
    desc: "Registra ingresos y gastos asignándolos a una persona. Los gastos pueden asociarse a un rubro del presupuesto mensual para llevar el control contra lo presupuestado.",
    icon: Wallet,
    href: "/gastos",
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    iconColor: "text-amber-500",
    extraLinks: [
      { label: "Ir a Ingresos", href: "/ingresos", icon: ArrowDownCircle },
      { label: "Ir a Gastos", href: "/gastos", icon: ArrowUpCircle },
    ],
  },
  {
    id: 5,
    title: "Monitorear el dashboard",
    desc: "El Dashboard principal y la vista de cada mes en Presupuestos te muestran gráficamente el avance: cuánto se ha gastado vs presupuestado, y el saldo disponible.",
    icon: CheckCircle2,
    href: "/",
    color: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
    iconColor: "text-rose-500",
  },
]

export default function GuiaPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Guía de uso</h1>
        <p className="text-muted-foreground">
          Sigue estos pasos en orden para empezar a usar KellyCash.
        </p>
      </div>

      {/* Flow diagram */}
      <div className="flex items-center gap-1.5 flex-wrap mb-10 p-4 rounded-xl bg-muted/30 border">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1.5">
            <Link
              href={step.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-background border hover:bg-accent transition-colors shrink-0"
            >
              <step.icon className="size-3.5" />
              {step.title}
            </Link>
            {i < steps.length - 1 && <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>

      {/* Detailed steps */}
      <div className="space-y-5">
        {steps.map((step, idx) => {
          const Icon = step.icon
          return (
            <div key={step.id} className={`rounded-xl border p-5 bg-gradient-to-br ${step.color}`}>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center size-10 rounded-full bg-background border shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-muted-foreground">{step.id}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Icon className={`size-5 ${step.iconColor}`} />
                    <h2 className="text-lg font-semibold">{step.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{step.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={step.href}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-background border hover:bg-accent transition-colors"
                    >
                      Ir a {step.title.toLowerCase()}
                      <ArrowRight className="size-3" />
                    </Link>
                    {step.extraLinks?.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-background border hover:bg-accent transition-colors"
                      >
                        <link.icon className="size-3" />
                        {link.label}
                        <ArrowRight className="size-3" />
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
      <div className="mt-10 p-4 rounded-xl bg-muted/30 border">
        <h3 className="text-sm font-semibold mb-2">Consejos</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Las personas deben crearse <strong>antes</strong> de registrar ingresos o gastos.</li>
          <li>La plantilla de presupuesto puede tener tantos rubros como necesites.</li>
          <li>Puedes generar varios meses desde una misma plantilla.</li>
          <li>Los gastos se pueden asignar a un rubro o dejarlos &quot;Sin rubro&quot;.</li>
          <li>Todo se puede editar o eliminar con los botones al lado de cada registro.</li>
        </ul>
      </div>
    </div>
  )
}
