import { useEffect, useState, useCallback, useMemo } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getDashboardData, getYearlyData } from "@/services/api"
import { formatCurrency } from "@/utils/format"
import { useMonthFilter } from "@/hooks/useMonthFilter"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react-native"
import type { DashboardData, YearlyMonth } from "@/types/database"
import LineChart from "@/components/LineChart"
import DateFilter from "@/components/DateFilter"

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dec"]

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const { months, setMonths } = useMonthFilter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [yearlyData, setYearlyData] = useState<YearlyMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const screenWidth = Dimensions.get("window").width

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const [dashboard, yearly] = await Promise.all([
        getDashboardData(months),
        getYearlyData(new Date().getFullYear()),
      ])
      setData(dashboard)
      setYearlyData(yearly)
    } catch (error) {
      console.error("[KellyCash][Mobile][Dashboard] load failed", error)
      setLoadError("No se pudieron cargar los resúmenes. Verifica sesión, RLS y variables de Supabase.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [months])

  useEffect(() => { load() }, [load])

  useRealtimeSubscription("expenses", () => load(), () => load(), () => load())
  useRealtimeSubscription("income", () => load(), () => load(), () => load())

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const filteredYearly = useMemo(() => {
    if (!months.length) return yearlyData
    return yearlyData.filter((m) => months.includes(m.month))
  }, [yearlyData, months])

  const cashflowDatasets = useMemo(() => {
    if (!filteredYearly.length) return []
    const labels = filteredYearly.map((m) => MONTHS_SHORT[parseInt(m.month.split("-")[1]) - 1])
    return [
      {
        label: "Ingresos",
        color: "#10b981",
        fillColor: "rgba(16,185,129,0.06)",
        data: filteredYearly.map((m) => ({ label: labels[filteredYearly.indexOf(m)], value: m.ingresos })),
      },
      {
        label: "Gastos",
        color: "#f43f5e",
        data: filteredYearly.map((m) => ({ label: labels[filteredYearly.indexOf(m)], value: m.gastos })),
        dash: [5, 5],
      },
    ]
  }, [filteredYearly])

  const chartWidth = Math.min(screenWidth - 64, 600)

  const spentPct = data && data.totalBudgeted > 0 ? Math.min(100, (data.totalGastos / data.totalBudgeted) * 100) : 0

  const KPI_CARDS = [
    {
      label: "Ingresos",
      value: data?.totalIngresos ?? 0,
      icon: TrendingDown,
      color: "#059669",
      iconBg: "bg-emerald-100",
    },
    {
      label: "Gastos",
      value: data?.totalGastos ?? 0,
      icon: TrendingUp,
      color: "#e11d48",
      iconBg: "bg-rose-100",
    },
    {
      label: "Presupuesto",
      value: data?.totalBudgeted ?? 0,
      icon: Wallet,
      color: "#4f46e5",
      iconBg: "bg-indigo-100",
    },
    {
      label: "Balance",
      value: data?.balance ?? 0,
      icon: PiggyBank,
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
      <View style={{ flex: 1, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f8fafc", paddingTop: insets.top + 12 }}
      contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
    >
      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1e293b" }}>Resumen</Text>
          <DateFilter months={months} onChange={setMonths} />
        </View>
        {loadError ? (
          <View style={{ marginBottom: 12, borderWidth: 1, borderColor: "#fecaca", borderRadius: 12, backgroundColor: "#fff1f2", paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ fontSize: 11, color: "#be123c" }}>{loadError}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          {KPI_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <View
                key={card.label}
                style={{
                  width: "47%",
                  backgroundColor: "white",
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#f1f5f9",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <View style={{ padding: 6, borderRadius: 8, backgroundColor: card.iconBg === "bg-emerald-100" ? "#d1fae5" : card.iconBg === "bg-rose-100" ? "#ffe4e6" : card.iconBg === "bg-indigo-100" ? "#eef2ff" : "#f1f5f9" }}>
                    <Icon size={14} color={card.color} />
                  </View>
                </View>
                <Text style={{ fontSize: 10, fontWeight: "500", color: "#64748b", marginBottom: 2 }}>{card.label}</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#1e293b" }} numberOfLines={1}>
                  {formatCurrency(card.value)}
                </Text>
              </View>
            )
          })}
        </View>

        {data && data.totalBudgeted > 0 && (
          <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#f1f5f9", marginBottom: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#1e293b" }}>Presupuesto vs Gastos</Text>
              <Text style={{ fontSize: 11, color: "#64748b" }}>
                {formatCurrency(data.totalGastos)} / {formatCurrency(data.totalBudgeted)}
              </Text>
            </View>
            <View style={{ width: "100%", backgroundColor: "#f1f5f9", borderRadius: 4, height: 8 }}>
              <View
                style={{
                  width: `${Math.min(100, spentPct)}%`,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: spentPct > 100 ? "#f43f5e" : spentPct > 80 ? "#f59e0b" : "#10b981",
                }}
              />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{Math.round(spentPct)}% gastado</Text>
              <Text style={{ fontSize: 10, fontWeight: "600", color: spentPct > 100 ? "#f43f5e" : "#059669" }}>
                {spentPct > 100
                  ? `Exceso: ${formatCurrency(data.totalGastos - data.totalBudgeted)}`
                  : `Disponible: ${formatCurrency(data.totalBudgeted - data.totalGastos)}`
                }
              </Text>
            </View>
          </View>
        )}

        <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#f1f5f9", marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e293b" }}>Flujo de Caja</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            {cashflowDatasets.length > 0 ? (
              <LineChart
                datasets={cashflowDatasets}
                width={chartWidth}
                height={200}
              />
            ) : (
              <View style={{ height: 180, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: "#94a3b8" }}>Sin datos para el período seleccionado</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={{ fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 12 }}>Últimos movimientos</Text>
        {recentMovements.length === 0 ? (
          <View style={{ backgroundColor: "white", borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "#f1f5f9", alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: "#94a3b8" }}>Sin movimientos en este período</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#f1f5f9", overflow: "hidden" }}>
            {recentMovements.slice(0, 8).map((mov: any) => (
              <View
                key={`${mov.tipo}-${mov.id}`}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: mov.tipo === "ingreso" ? "#d1fae5" : "#ffe4e6", alignItems: "center", justifyContent: "center" }}>
                  {mov.tipo === "ingreso" ? (
                    <TrendingDown size={12} color="#059669" />
                  ) : (
                    <TrendingUp size={12} color="#e11d48" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: "#0f172a" }} numberOfLines={1}>
                    {mov.description || "Sin concepto"}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                    {new Date(mov.date).toLocaleDateString("es-CO")}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: mov.tipo === "ingreso" ? "#059669" : "#e11d48" }}>
                  {mov.tipo === "ingreso" ? "+" : "-"}{formatCurrency(Number(mov.amount))}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}
