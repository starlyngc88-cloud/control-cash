import { View, Text, ScrollView, TouchableOpacity } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Users, PiggyBank, Target, Wallet, CheckCircle2, Goal, Crosshair, ShieldCheck, Settings2, ArrowLeft, ArrowRight } from "lucide-react-native"

const steps = [
  {
    id: 1,
    title: "Crear personas",
    desc: "Registra a cada persona que administrará dinero en la app. Son los participantes del control compartido.",
    icon: Users,
    route: "/personas" as const,
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    id: 2,
    title: "Crear plantilla de presupuesto",
    desc: "Define una plantilla con los rubros (categorías) en los que se gasta: Comida, Transporte, Servicios, etc. Esta plantilla será la base de cada mes.",
    icon: PiggyBank,
    route: "/(tabs)/presupuestos" as const,
    color: "#10b981",
    bg: "#ecfdf5",
  },
  {
    id: 3,
    title: "Generar un mes",
    desc: "Dentro de la plantilla, genera un mes financiero (ej: Agosto 2026). La app copia automáticamente los rubros con sus montos asignados para ese mes.",
    icon: Target,
    route: "/(tabs)/presupuestos" as const,
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  {
    id: 4,
    title: "Agregar ingresos y gastos",
    desc: "Registra ingresos y gastos asignándolos a una persona. Los gastos pueden asociarse a un rubro del presupuesto mensual para llevar el control contra lo presupuestado.",
    icon: Wallet,
    route: "/(tabs)/gastos" as const,
    color: "#f59e0b",
    bg: "#fffbeb",
    extras: [
      { label: "Ir a Ingresos", route: "/(tabs)/ingresos" as const },
      { label: "Ir a Gastos", route: "/(tabs)/gastos" as const },
    ],
  },
  {
    id: 5,
    title: "Monitorear el dashboard",
    desc: "El Dashboard principal y la vista de cada mes en Presupuestos te muestran gráficamente el avance: cuánto se ha gastado vs presupuestado, y el saldo disponible.",
    icon: CheckCircle2,
    route: "/(tabs)" as const,
    color: "#f43f5e",
    bg: "#fff1f2",
  },
  {
    id: 6,
    title: "Ahorra con La Hucha",
    desc: "Crea metas de ahorro (huchas) y regístrale movimientos. Agrúpalas por categoría para organizar tus propósitos: fondo de emergencia, viaje, estudios, etc.",
    icon: Goal,
    route: "/(tabs)/hucha" as const,
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  {
    id: 7,
    title: "Planifica Gastos Futuros",
    desc: "Registra gastos que sabes que vendrán (seguros, impuestos, cumpleaños). El planificador te calcula cuánto ahorrar por mes para alcanzar la meta a tiempo.",
    icon: Crosshair,
    route: "/(tabs)/gastos-futuros" as const,
    color: "#f97316",
    bg: "#fff7ed",
  },
  {
    id: 8,
    title: "Controla tus Compromisos",
    desc: "Administra deudas grandes (carro, casa, moto) con pagos y abono a capital. Asócialos a un rubro presupuestal y dale seguimiento al progreso de pago.",
    icon: ShieldCheck,
    route: "/(tabs)/compromisos" as const,
    color: "#6366f1",
    bg: "#eef2ff",
  },
  {
    id: 9,
    title: "Personaliza tu experiencia",
    desc: "Elige entre estilo Estándar o Caribe, cambia la moneda (COP/EUR), y si eres admin gestiona los usuarios autorizados desde Personalización.",
    icon: Settings2,
    route: "/personalizacion" as const,
    color: "#64748b",
    bg: "#f8fafc",
  },
]

const tips = [
  "Las personas deben crearse antes de registrar ingresos o gastos.",
  "La plantilla de presupuesto puede tener tantos rubros como necesites.",
  "Puedes generar varios meses desde una misma plantilla.",
  "Los gastos se pueden asignar a un rubro o dejarlos \"Sin rubro\".",
  "Todo se puede editar o eliminar con los botones al lado de cada registro.",
]

export default function GuiaScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center gap-2 px-4 mb-4">
        <TouchableOpacity onPress={() => router.back()} className="size-8 rounded-lg bg-white border border-slate-200 items-center justify-center">
          <ArrowLeft size={16} color="#475569" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-800">Guía de uso</Text>
          <Text className="text-[11px] text-slate-500">Sigue estos pasos en orden para empezar a usar KellyCash.</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        <View className="gap-3">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <View key={step.id} className="rounded-xl border border-slate-200 p-3" style={{ backgroundColor: step.bg }}>
                <View className="flex-row items-start gap-3">
                  <View className="size-7 rounded-full bg-white border border-slate-200 items-center justify-center shrink-0 mt-0.5">
                    <Text className="text-[11px] font-bold text-slate-500">{step.id}</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Icon size={14} color={step.color} />
                      <Text className="text-sm font-semibold text-slate-800">{step.title}</Text>
                    </View>
                    <Text className="text-[11px] text-slate-500 mb-2 leading-5">{step.desc}</Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      <TouchableOpacity
                        onPress={() => router.push(step.route)}
                        className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200"
                      >
                        <Text className="text-[10px] font-medium text-slate-600">Ir a {step.title.toLowerCase()}</Text>
                        <ArrowRight size={10} color="#64748b" />
                      </TouchableOpacity>
                      {step.extras?.map((extra) => (
                        <TouchableOpacity
                          key={extra.route}
                          onPress={() => router.push(extra.route)}
                          className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200"
                        >
                          <Text className="text-[10px] font-medium text-slate-600">{extra.label}</Text>
                          <ArrowRight size={10} color="#64748b" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        <View className="mt-4 p-3 rounded-xl bg-slate-100 border border-slate-200">
          <Text className="text-xs font-semibold text-slate-700 mb-1.5">Consejos</Text>
          {tips.map((tip, i) => (
            <Text key={i} className="text-[11px] text-slate-500 leading-5">• {tip}</Text>
          ))}
        </View>

        <View className="h-8" />
      </ScrollView>
    </View>
  )
}
