import { useLocalSearchParams, router } from "expo-router"
import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getMonthlyBudgets, getExpenses, getBudgetCategories } from "@/services/api"
import { formatCurrency, formatMonth } from "@/utils/format"
import { X, ChevronDown, ChevronRight } from "lucide-react-native"

type CatStatus = "green" | "yellow" | "red"

interface CatData {
  id: string
  name: string
  budgeted: number
  spent: number
  available: number
  excess: number
  percentage: number
  status: CatStatus
  parent_id: string | null
  children: CatData[]
}

export default function PresupuestoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const [monthlyBudget, setMonthlyBudget] = useState<any>(null)
  const [roots, setRoots] = useState<CatData[]>([])
  const [totalBudgeted, setTotalBudgeted] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoadError(null)
      const [allMonthly, allExpenses] = await Promise.all([
        getMonthlyBudgets(),
        getExpenses(),
      ])
      const mb = allMonthly.find((m: any) => m.id === id)
      if (!mb) { setLoading(false); setRefreshing(false); return }

      const categories = await getBudgetCategories(mb.template_id)

      const monthDate = new Date(mb.month + "T00:00:00")
      const year = monthDate.getFullYear()
      const mon = monthDate.getMonth()
      const startDate = new Date(year, mon, 1).toISOString().split("T")[0]
      const endDate = new Date(year, mon + 1, 0).toISOString().split("T")[0]

      const monthExpenses = allExpenses.filter(
        (e: any) => e.date >= startDate && e.date <= endDate
      )

      const catSpent: Record<string, number> = {}
      for (const exp of monthExpenses) {
        if (exp.budget_category_id) {
          catSpent[exp.budget_category_id] = (catSpent[exp.budget_category_id] ?? 0) + Number(exp.amount)
        }
      }

      const treeMap = new Map<string, any>()
      for (const cat of categories) treeMap.set(cat.id, { ...cat, children: [] })
      const rootNodes: any[] = []
      for (const cat of categories) {
        const node = treeMap.get(cat.id)
        if (cat.parent_id && treeMap.has(cat.parent_id)) {
          treeMap.get(cat.parent_id).children.push(node)
        } else {
          rootNodes.push(node)
        }
      }

      const nodeBudgeted = (n: any): number =>
        n.children.length === 0 ? Number(n.budgeted) : n.children.reduce((s: number, c: any) => s + nodeBudgeted(c), 0)

      const nodeSpent = (n: any): number =>
        n.children.length === 0 ? (catSpent[n.id] ?? 0) : n.children.reduce((s: number, c: any) => s + nodeSpent(c), 0)

      const buildNode = (n: any): CatData => {
        const budgeted = nodeBudgeted(n)
        const spent = nodeSpent(n)
        const available = Math.max(0, budgeted - spent)
        const excess = Math.max(0, spent - budgeted)
        const percentage = budgeted > 0 ? (spent / budgeted) * 100 : spent > 0 ? Infinity : 0
        let status: CatStatus = "green"
        if (percentage > 100) status = "red"
        else if (percentage >= 80) status = "yellow"
        return {
          id: n.id, name: n.name, budgeted, spent, available, excess, percentage, status,
          parent_id: n.parent_id ?? null, children: n.children.map(buildNode),
        }
      }

      setRoots(rootNodes.map(buildNode))
      setMonthlyBudget(mb)
      setTotalBudgeted(rootNodes.reduce((s: number, r: any) => s + nodeBudgeted(r), 0))
      setTotalSpent(rootNodes.reduce((s: number, r: any) => s + nodeSpent(r), 0))
    } catch (error) {
      console.error("[KellyCash][Mobile][PresupuestoDetalle] load failed", error)
      setLoadError("No se pudo calcular el detalle del presupuesto con los gastos actuales.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const toggle = (catId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const remaining = totalBudgeted - totalSpent

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8fafc] items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }

  if (!monthlyBudget) {
    return (
      <View className="flex-1 bg-[#f8fafc] items-center justify-center" style={{ paddingTop: insets.top }}>
        <Text className="text-sm text-slate-400">Presupuesto no encontrado</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center gap-2 px-4 mb-3">
        <TouchableOpacity onPress={() => router.back()}>
          <X size={18} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800 capitalize">
          {formatMonth(monthlyBudget.month)}
        </Text>
        <Text className="text-xs text-slate-400">
          · {monthlyBudget.budget_templates?.name}
        </Text>
      </View>

      {loadError ? (
        <View className="mx-4 mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
          <Text className="text-[11px] text-rose-700">{loadError}</Text>
        </View>
      ) : null}

      <View className="mx-4 mb-3 flex-row gap-2">
        <View className="flex-1 bg-white rounded-xl border border-slate-100 px-3 py-2.5">
          <Text className="text-[10px] text-slate-400 mb-0.5">Presupuestado</Text>
          <Text className="text-sm font-bold text-slate-800">{formatCurrency(totalBudgeted)}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl border border-slate-100 px-3 py-2.5">
          <Text className="text-[10px] text-slate-400 mb-0.5">Gastado</Text>
          <Text className="text-sm font-bold text-red-600">{formatCurrency(totalSpent)}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl border border-slate-100 px-3 py-2.5">
          <Text className="text-[10px] text-slate-400 mb-0.5">Disponible</Text>
          <Text className={`text-sm font-bold ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(remaining)}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />
        }
      >
        <View className="space-y-2">
          {roots.length === 0 && (
            <View className="items-center py-8">
              <Text className="text-xs text-slate-400">No hay categorías en este presupuesto</Text>
            </View>
          )}

          {roots.map((parent) => {
            const hasChildren = parent.children.length > 0
            const isExpanded = expanded.has(parent.id)
            const ppct = parent.percentage === Infinity ? 0 : Math.round(parent.percentage)
            const ppctBg = ppct === 0 ? "bg-green-100" : ppct >= 100 ? "bg-red-100" : "bg-yellow-100"
            const ppctText = ppct === 0 ? "text-green-700" : ppct >= 100 ? "text-red-700" : "text-yellow-700"

            return (
              <View key={parent.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <TouchableOpacity
                  onPress={() => hasChildren && toggle(parent.id)}
                  className="flex-row items-center px-3 py-2.5"
                  activeOpacity={hasChildren ? 0.7 : 1}
                >
                  <View className="flex-1 flex-row items-center gap-1.5">
                    {hasChildren && (
                      <View className="mr-0.5">
                        {isExpanded ? <ChevronDown size={12} color="#94a3b8" /> : <ChevronRight size={12} color="#94a3b8" />}
                      </View>
                    )}
                    <View className={`w-2 h-2 rounded-full ${parent.status === "green" ? "bg-green-500" : parent.status === "yellow" ? "bg-yellow-500" : "bg-red-500"}`} />
                    <Text className="text-sm font-semibold text-slate-800">{parent.name}</Text>
                  </View>
                  <Text className="text-xs text-slate-500 tabular-nums mr-2">{formatCurrency(parent.spent)}</Text>
                  <View className={`rounded-md px-1.5 py-0.5 ${ppctBg}`}>
                    <Text className={`text-[10px] font-medium ${ppctText}`}>{ppct > 0 ? `${ppct}%` : "—"}</Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && hasChildren && (
                  <View className="bg-slate-50 border-t border-slate-100">
                    {parent.children.map((child) => {
                      const cpct = child.percentage === Infinity ? 0 : Math.round(child.percentage)
                      const cpctBg = cpct === 0 ? "bg-green-100" : cpct >= 100 ? "bg-red-100" : "bg-yellow-100"
                      const cpctText = cpct === 0 ? "text-green-700" : cpct >= 100 ? "text-red-700" : "text-yellow-700"
                      return (
                        <View key={child.id} className="flex-row items-center px-3 py-1.5 ml-4">
                          <View className="flex-1 flex-row items-center gap-1.5">
                            <View className={`w-1.5 h-1.5 rounded-full ${child.status === "green" ? "bg-green-500" : child.status === "yellow" ? "bg-yellow-500" : "bg-red-500"}`} />
                            <Text className="text-xs text-slate-500">└ {child.name}</Text>
                          </View>
                          <Text className="text-[10px] text-slate-400 tabular-nums mr-2">{formatCurrency(child.budgeted)}</Text>
                          <Text className="text-xs text-slate-600 tabular-nums font-medium mr-2">{formatCurrency(child.spent)}</Text>
                          <View className={`rounded-md px-1.5 py-0.5 ${cpctBg}`}>
                            <Text className={`text-[10px] font-medium ${cpctText}`}>{cpct > 0 ? `${cpct}%` : "—"}</Text>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )}
              </View>
            )
          })}
        </View>
        <View className="h-8" />
      </ScrollView>
    </View>
  )
}
