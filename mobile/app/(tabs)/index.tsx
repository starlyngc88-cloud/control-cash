import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getDashboardData } from "@/services/api"
import { formatCurrency } from "@/utils/format"
import { useMonthFilter } from "@/hooks/useMonthFilter"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react-native"
import type { DashboardData } from "@/types/database"

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const { months } = useMonthFilter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const result = await getDashboardData(months)
    setData(result)
    setLoading(false)
    setRefreshing(false)
  }, [months])

  useEffect(() => { load() }, [load])

  useRealtimeSubscription(
    "expenses",
    () => load(),
    () => load(),
    () => load()
  )
  useRealtimeSubscription(
    "incomes",
    () => load(),
    () => load(),
    () => load()
  )

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const KPI_CARDS = [
    {
      label: "Ingresos",
      value: data?.totalIngresos ?? 0,
      icon: TrendingDown,
      bg: "bg-emerald-50",
      color: "#059669",
      iconBg: "bg-emerald-100",
    },
    {
      label: "Gastos",
      value: data?.totalGastos ?? 0,
      icon: TrendingUp,
      bg: "bg-rose-50",
      color: "#e11d48",
      iconBg: "bg-rose-100",
    },
    {
      label: "Presupuesto",
      value: data?.totalBudgeted ?? 0,
      icon: Wallet,
      bg: "bg-indigo-50",
      color: "#4f46e5",
      iconBg: "bg-indigo-100",
    },
    {
      label: "Balance",
      value: data?.balance ?? 0,
      icon: PiggyBank,
      bg: "bg-slate-50",
      color: "#475569",
      iconBg: "bg-slate-100",
    },
  ]

  const recentMovements = [
    ...(data?.recentIncomes?.map((i) => ({ ...i, tipo: "ingreso" })) ?? []),
    ...(data?.recentExpenses?.map((e) => ({ ...e, tipo: "gasto" })) ?? []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-[#f8fafc]"
      contentContainerClassName="px-4 pb-8"
      style={{ paddingTop: insets.top + 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
    >
      <Text className="text-lg font-bold text-slate-800 mb-4">Resumen</Text>

      {/* KPI Cards */}
      <View className="flex-row flex-wrap gap-3 mb-6">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <View key={card.label} className="w-[calc(50%-6px)] bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <View className="flex-row items-start justify-between mb-2">
                <View className={`p-2 rounded-lg ${card.iconBg}`}>
                  <Icon size={16} color={card.color} />
                </View>
              </View>
              <Text className="text-[10px] font-medium text-slate-500 mb-0.5">{card.label}</Text>
              <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
                {formatCurrency(card.value)}
              </Text>
            </View>
          )
        })}
      </View>

      {/* Recent Movements */}
      <Text className="text-sm font-semibold text-slate-700 mb-3">Últimos movimientos</Text>
      {recentMovements.length === 0 ? (
        <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
          <Text className="text-xs text-slate-400">Sin movimientos en este período</Text>
        </View>
      ) : (
        <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {recentMovements.slice(0, 8).map((mov: any) => (
            <View key={`${mov.tipo}-${mov.id}`} className="flex-row items-center px-4 py-3 border-b border-slate-100 last:border-b-0">
              <View className={`size-8 rounded-full items-center justify-center ${mov.tipo === "ingreso" ? "bg-emerald-100" : "bg-rose-100"}`}>
                {mov.tipo === "ingreso" ? (
                  <TrendingDown size={14} color="#059669" />
                ) : (
                  <TrendingUp size={14} color="#e11d48" />
                )}
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-xs font-medium text-slate-900" numberOfLines={1}>
                  {mov.description || "Sin concepto"}
                </Text>
                <Text className="text-[10px] text-slate-400">
                  {new Date(mov.date).toLocaleDateString("es-CO")}
                </Text>
              </View>
              <Text className={`text-xs font-semibold ${mov.tipo === "ingreso" ? "text-emerald-600" : "text-rose-600"}`}>
                {mov.tipo === "ingreso" ? "+" : "-"}{formatCurrency(Number(mov.amount))}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}
