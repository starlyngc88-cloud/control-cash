import { useEffect, useState, useCallback, useMemo } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { getDashboardData, getCashflowData, getCategoryCashflowData, getMonthlyBudgets, getFinancialInsights, autoGranularity, granularityLabel } from "@/services/api"
import { formatCurrency } from "@/utils/format"
import { useMonthFilter } from "@/hooks/useMonthFilter"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { Wallet, TrendingUp, TrendingDown, PiggyBank, ChevronRight, AlertTriangle } from "lucide-react-native"
import type { DashboardData, CashflowPoint, CategoryCashflowItem, FinancialInsight } from "@/types/database"
import LineChart from "@/components/LineChart"
import DateFilter from "@/components/DateFilter"
import CategoryFilter from "@/components/CategoryFilter"

const PALETTE = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#0ea5e9", "#a855f7", "#84cc16", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#22c55e"]

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { months, setMonths } = useMonthFilter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [cashflowData, setCashflowData] = useState<CashflowPoint[]>([])
  const [categoryItems, setCategoryItems] = useState<CategoryCashflowItem[]>([])
  const [categoryLabels, setCategoryLabels] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[] | null>(null)
  const [monthlyBudgetId, setMonthlyBudgetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [insights, setInsights] = useState<FinancialInsight[]>([])
  const screenWidth = Dimensions.get("window").width

  const range = useMemo(() => {
    if (months.length === 0) return { startDate: "", endDate: "" }
    const sorted = [...months].sort()
    const first = sorted[0]
    const [y, m] = sorted[sorted.length - 1].split("-").map(Number)
    return { startDate: first + "-01", endDate: new Date(y, m, 0).toISOString().split("T")[0] }
  }, [months])

  const granularity = useMemo(() => autoGranularity(range.startDate, range.endDate), [range])

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const [dashboard, budgets, cashflow, category, insightsData] = await Promise.all([
        getDashboardData(months),
        getMonthlyBudgets(),
        range.startDate ? getCashflowData(range.startDate, range.endDate, granularity) : Promise.resolve([] as CashflowPoint[]),
        range.startDate ? getCategoryCashflowData(range.startDate, range.endDate, granularity) : Promise.resolve({ labels: [], items: [] }),
        getFinancialInsights(),
      ])
      setData(dashboard)
      setCashflowData(cashflow)
      setCategoryItems(category.items)
      setCategoryLabels(category.labels)
      setInsights(insightsData)
      if (months.length === 1) {
        const firstDay = months[0] + "-01"
        const mb = budgets.find((b) => b.month === firstDay)
        setMonthlyBudgetId(mb?.id ?? null)
      } else {
        setMonthlyBudgetId(null)
      }
    } catch (error) {
      console.error("[KellyCash][Mobile][Dashboard] load failed", error)
      setLoadError("No se pudieron cargar los resúmenes. Verifica sesión, RLS y variables de Supabase.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [months, range, granularity])

  useEffect(() => {
    void (async () => { await load() })()
  }, [load])

  useRealtimeSubscription("expenses", () => load(), () => load(), () => load())
  useRealtimeSubscription("income", () => load(), () => load(), () => load())

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const cashflowDatasets = useMemo(() => {
    if (!cashflowData.length) return []
    return [
      {
        label: "Ingresos",
        color: "#10b981",
        fillColor: "rgba(16,185,129,0.06)",
        data: cashflowData.map((p) => ({ label: p.label, value: p.ingresos })),
      },
      {
        label: "Gastos",
        color: "#f43f5e",
        data: cashflowData.map((p) => ({ label: p.label, value: p.gastos })),
        dash: [5, 5],
      },
    ]
  }, [cashflowData])

  const categoryDatasets = useMemo(() => {
    if (!categoryItems.length || !categoryLabels.length) return []
    const showAll = selectedCategories === null
    const visible = categoryItems.filter((item) => showAll || selectedCategories.includes(item.name))
    return visible.map((item, i) => ({
      label: item.name,
      color: PALETTE[i % PALETTE.length],
      data: item.points.map((p) => ({ label: p.label, value: p.gastos })),
    }))
  }, [categoryItems, categoryLabels, selectedCategories])

  const chartWidth = Math.min(screenWidth - 64, 600)

  const spentPct = data && data.totalBudgeted > 0 ? Math.min(100, (data.totalGastos / data.totalBudgeted) * 100) : 0
  const spentBarColor = spentPct > 100 ? "#f43f5e" : spentPct > 80 ? "#f59e0b" : "#10b981"

  const KPI_CARDS = [
    {
      label: "Disponible para gastar",
      value: (data?.totalIngresos ?? 0) - (data?.totalBudgeted ?? 0) - (data?.totalGastosSinRubro ?? 0),
      icon: TrendingDown,
      color: "#059669",
      iconBg: "bg-emerald-100",
      subtitle: `Ingreso inicial: ${formatCurrency(data?.totalIngresos ?? 0)}`,
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
      value: (data?.totalBudgeted ?? 0) - (data?.totalGastosConRubro ?? 0),
      icon: Wallet,
      color: "#4f46e5",
      iconBg: "bg-indigo-100",
      subtitle: `Presupuesto inicial: ${formatCurrency(data?.totalBudgeted ?? 0)}`,
    },
    {
      label: "Saldo real en cuenta a la fecha",
      value: data?.balance ?? 0,
      icon: PiggyBank,
      color: "#475569",
      iconBg: "bg-slate-100",
    },
  ]

  const recentMovements: { id: string; date: string; amount: number; description: string | null; tipo: "ingreso" | "gasto" }[] = [
    ...(data?.recentIncomes?.map((i) => ({ ...i, tipo: "ingreso" as const })) ?? []),
    ...(data?.recentExpenses?.map((e) => ({ ...e, tipo: "gasto" as const })) ?? []),
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
                {card.subtitle ? (
                  <Text style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }} numberOfLines={1}>
                    {card.subtitle}
                  </Text>
                ) : null}
                {card.label === "Gastos" && data && data.totalBudgeted > 0 && (
                  <View style={{ marginTop: 8, height: 4, borderRadius: 2, backgroundColor: "#f1f5f9", overflow: "hidden" }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: spentBarColor, width: `${spentPct}%` }} />
                  </View>
                )}
                {card.label === "Presupuesto" && monthlyBudgetId && (
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/presupuesto-detalle", params: { id: monthlyBudgetId } })}
                    style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 2 }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "500", color: "#4f46e5" }}>Ver detalle</Text>
                    <ChevronRight size={12} color="#4f46e5" />
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </View>

        {insights.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e293b", marginBottom: 12 }}>Alertas financieras</Text>
            {insights.map((insight, i) => {
              if (insight.type === "income_drop") {
                return (
                  <View key={`insight-${i}`} style={{ backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#f1f5f9", marginBottom: 8, flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View style={{ backgroundColor: "#fff1f2", borderRadius: 8, padding: 6 }}>
                      <TrendingDown size={14} color="#e11d48" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "500", color: "#e11d48" }}>Ingresos bajaron</Text>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#1e293b" }}>
                        Ingresaste {formatCurrency(insight.currentAmount)} este mes, menos que los {formatCurrency(insight.previousAmount)} del mes pasado
                      </Text>
                      <View style={{ backgroundColor: "#fff1f2", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginTop: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: "600", color: "#e11d48" }}>-{insight.dropPercent}% menos</Text>
                      </View>
                    </View>
                  </View>
                )
              }
              if (insight.type === "low_savings_rate") {
                return (
                  <View key={`insight-${i}`} style={{ backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#f1f5f9", marginBottom: 8, flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View style={{ backgroundColor: "#fffbeb", borderRadius: 8, padding: 6 }}>
                      <PiggyBank size={14} color="#d97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "500", color: "#d97706" }}>Ahorro bajo</Text>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#1e293b" }}>
                        Solo ahorrás el {insight.rate}% de lo que ingresás
                      </Text>
                      <View style={{ backgroundColor: "#fffbeb", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginTop: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: "600", color: "#d97706" }}>Ahorraste {formatCurrency(insight.totalDeposits)} de {formatCurrency(insight.totalIncome)} ingresados</Text>
                      </View>
                    </View>
                  </View>
                )
              }
              if (insight.type === "chronic_overspend") {
                return (
                  <View key={`insight-${i}`} style={{ backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#f1f5f9", marginBottom: 8, flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View style={{ backgroundColor: "#fef2f2", borderRadius: 8, padding: 6 }}>
                      <AlertTriangle size={14} color="#dc2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "500", color: "#dc2626" }}>Presupuesto superado</Text>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#1e293b" }}>
                        La categoría {insight.categoryName} se pasó del presupuesto {insight.timesOverBudget} {insight.timesOverBudget === 1 ? "vez" : "veces"} en los últimos {insight.totalMonths} meses
                      </Text>
                      <View style={{ backgroundColor: "#fef2f2", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginTop: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: "600", color: "#dc2626" }}>Excediste {formatCurrency(insight.totalExcess)} en total</Text>
                      </View>
                    </View>
                  </View>
                )
              }
              return null
            })}
          </View>
        )}

        <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#f1f5f9", marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e293b" }}>Gastos por Categoría</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#eef2ff" }}>
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#4f46e5", textTransform: "uppercase" }}>Vista: {granularityLabel(granularity)}</Text>
              </View>
              {categoryItems.length > 0 && (
                <CategoryFilter
                  items={categoryItems.map((i) => i.name)}
                  value={selectedCategories}
                  onChange={setSelectedCategories}
                />
              )}
            </View>
          </View>
          <View style={{ alignItems: "center" }}>
            {categoryDatasets.length > 0 ? (
              <>
                <LineChart
                  datasets={categoryDatasets}
                  width={chartWidth}
                  height={200}
                  showLegend={false}
                />
                <View style={{ alignSelf: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12, width: "100%" }}>
                  {categoryDatasets.map((ds, i) => (
                    <View key={`${ds.label}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ds.color }} />
                      <Text style={{ fontSize: 10, color: "#64748b" }} numberOfLines={1}>{ds.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={{ height: 180, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: "#94a3b8" }}>Sin datos para el período seleccionado</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#f1f5f9", marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e293b" }}>Flujo de Caja</Text>
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#eef2ff" }}>
              <Text style={{ fontSize: 9, fontWeight: "600", color: "#4f46e5", textTransform: "uppercase" }}>Vista: {granularityLabel(granularity)}</Text>
            </View>
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
            {recentMovements.slice(0, 8).map((mov) => (
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
