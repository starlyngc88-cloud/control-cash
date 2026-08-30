import { Dictionary } from "./types"
import { esStandard } from "./es"

export const esKellyCaribe: Dictionary = {
  ...esStandard,
  app: { name: "ControlCash", tagline: "Finanzas del caribe" },
  dashboard: {
    ...esStandard.dashboard,
    subtitle: "Vistazo rápido de la billetera",
  },
  gastos: {
    ...esStandard.gastos,
    subtitle: "Anotá los gastos del día",
  },
  ingresos: {
    ...esStandard.ingresos,
    subtitle: "Anotá lo que entró",
  },
  ahorros: {
    ...esStandard.ahorros,
    subtitle: "Las huchas del hogar",
    descripcionPlaceholder: "¿Pa' qué es este ahorro?",
  },
  gastosFuturos: {
    ...esStandard.gastosFuturos,
    subtitle: "Lo que falta por pagar",
  },
  compromisos: {
    ...esStandard.compromisos,
    subtitle: "Deudas y cuotas",
    pagoNotas: "Referencia",
  },
  ajustes: {
    ...esStandard.ajustes,
    guiaUso: "Guía Rápida",
  },
}
