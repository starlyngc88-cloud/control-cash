import { useLocalSearchParams, router } from "expo-router"
import { useEffect, useState, useCallback, useMemo } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/providers/AuthProvider"
import { getMonthlyBudgetDashboard, createExpense, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory, setBudgetCategoryPaid, getMonthlyBudgets, getPeople, type MonthCategoryNode } from "@/services/api"
import { formatCurrency, formatMonth } from "@/utils/format"
import { X, ChevronDown, ChevronRight, Pencil, Plus, Trash2, CheckCircle2, ChevronLeft } from "lucide-react-native"
import type { Person } from "@/types/database"

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const emDash = "—"

const COL_WIDTHS = { name: 150, num: 74, status: 54, actions: 128 }

function statusChip(label: string, bg: string, color: string) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
      <Text style={{ fontSize: 9, fontWeight: "600", color }}>{label}</Text>
    </View>
  )
}

function pctChip(ppct: number, isPaid: boolean) {
  if (isPaid) return statusChip("100%", "#d1fae5", "#047857")
  if (ppct === 0) return statusChip(emDash, "#d1fae5", "#047857")
  if (ppct >= 100) return statusChip(`${ppct}%`, "#ffe4e6", "#be123c")
  return statusChip(`${ppct}%`, "#fef3c7", "#b45309")
}

export default function PresupuestoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const { person: authPerson } = useAuth()
  const [monthlyBudget, setMonthlyBudget] = useState<{ month: string; templateName: string } | null>(null)
  const [totals, setTotals] = useState({ totalIngresos: 0, totalBudgeted: 0, totalGastos: 0, balance: 0 })
  const [roots, setRoots] = useState<MonthCategoryNode[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [allMonths, setAllMonths] = useState<{ id: string; month: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<MonthCategoryNode | null>(null)
  const [editName, setEditName] = useState("")
  const [editBudgeted, setEditBudgeted] = useState("")
  const [editHasChildren, setEditHasChildren] = useState(false)

  const [rootModalOpen, setRootModalOpen] = useState(false)
  const [rootName, setRootName] = useState("")
  const [rootBudgeted, setRootBudgeted] = useState("")

  const [subModalOpen, setSubModalOpen] = useState(false)
  const [addSubParent, setAddSubParent] = useState<MonthCategoryNode | null>(null)
  const [subName, setSubName] = useState("")
  const [subBudgeted, setSubBudgeted] = useState("")

  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [expCatId, setExpCatId] = useState("")
  const [expCatName, setExpCatName] = useState("")
  const [expAmount, setExpAmount] = useState("")
  const [expDesc, setExpDesc] = useState("")
  const [expPerson, setExpPerson] = useState("")
  const [expDate, setExpDate] = useState("")

  const load = useCallback(async () => {
    if (!id) { setLoading(false); setRefreshing(false); return }
    try {
      setLoadError(null)
      const [data, p, months] = await Promise.all([getMonthlyBudgetDashboard(id), getPeople(), getMonthlyBudgets()])
      setMonthlyBudget({ month: data.month, templateName: data.templateName })
      setTotals({ totalIngresos: data.totalIngresos, totalBudgeted: data.totalBudgeted, totalGastos: data.totalGastos, balance: data.balance })
      setRoots(data.categories)
      setPeople(p)
      setAllMonths(months.map((m) => ({ id: m.id, month: m.month })))
      const withChildren = data.categories.filter((c) => c.children.length > 0)
      setExpanded(new Set(withChildren.map((c) => c.id)))
    } catch (error) {
      console.error("[KellyCash][Mobile][PresupuestoDetalle] load failed", error)
      setLoadError("No se pudo calcular el detalle del presupuesto con los gastos actuales.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => { void (async () => { await load() })() }, [load])

  const openAddExpense = (cat: MonthCategoryNode) => {
    setExpCatId(cat.id)
    setExpCatName(cat.name)
    setExpAmount("")
    setExpDesc("")
    setExpPerson(authPerson?.id ?? people[0]?.id ?? "")
    setExpDate(new Date().toISOString().split("T")[0])
    setExpenseModalOpen(true)
  }

  const handleExpenseSubmit = async () => {
    if (!expAmount || !expPerson) { Alert.alert("Error", "Completá persona y monto."); return }
    setSubmitting(true)
    try {
      await createExpense({
        person_id: expPerson,
        amount: parseFloat(expAmount),
        description: expDesc || expCatName,
        date: expDate,
        budget_category_id: expCatId,
      })
      setExpenseModalOpen(false)
      await load()
    } catch { Alert.alert("Error", "No se pudo guardar el gasto.") }
    finally { setSubmitting(false) }
  }

  const openEdit = (cat: MonthCategoryNode) => {
    setEditingCat(cat)
    setEditName(cat.name)
    setEditBudgeted(String(cat.budgeted))
    setEditHasChildren(cat.children.length > 0)
    setEditModalOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!editingCat || !editName.trim()) return
    setSubmitting(true)
    try {
      await updateBudgetCategory(editingCat.id, { name: editName.trim(), budgeted: editHasChildren ? 0 : (parseFloat(editBudgeted) || 0) })
      setEditModalOpen(false)
      setEditingCat(null)
      await load()
    } catch { Alert.alert("Error", "No se pudo guardar.") } finally { setSubmitting(false) }
  }

  const handleAddRootSubmit = async () => {
    if (!rootName.trim()) return
    setSubmitting(true)
    try {
      await createBudgetCategory({ monthly_budget_id: id, name: rootName.trim(), budgeted: parseFloat(rootBudgeted) || 0, parent_id: null })
      setRootModalOpen(false)
      setRootName(""); setRootBudgeted("")
      await load()
    } catch { Alert.alert("Error", "No se pudo guardar.") } finally { setSubmitting(false) }
  }

  const handleAddSubSubmit = async () => {
    if (!addSubParent || !subName.trim()) return
    setSubmitting(true)
    try {
      await createBudgetCategory({ monthly_budget_id: id, name: subName.trim(), budgeted: parseFloat(subBudgeted) || 0, parent_id: addSubParent.id })
      setSubModalOpen(false)
      setAddSubParent(null); setSubName(""); setSubBudgeted("")
      await load()
    } catch { Alert.alert("Error", "No se pudo guardar.") } finally { setSubmitting(false) }
  }

  const handleDeleteCat = (cat: MonthCategoryNode) => {
    Alert.alert("Eliminar rubro", `¿Eliminar "${cat.name}"? Los gastos asociados quedarán sin rubro. Solo afecta a este mes.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        try { await deleteBudgetCategory(cat.id); await load() }
        catch { Alert.alert("Error", "No se pudo eliminar.") }
      } },
    ])
  }

  const togglePaid = async (cat: MonthCategoryNode) => {
    setSubmitting(true)
    try {
      await setBudgetCategoryPaid(cat.id, !cat.is_paid)
      await load()
    } catch { Alert.alert("Error", "No se pudo actualizar.") } finally { setSubmitting(false) }
  }

  const toggle = (catId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const { totalIngresos, totalBudgeted, totalGastos, balance } = totals
  const totalAvailable = totalBudgeted - totalGastos

  const allNodes = useMemo(() => {
    const flat: MonthCategoryNode[] = []
    const walk = (nodes: MonthCategoryNode[]) => {
      for (const n of nodes) { flat.push(n); walk(n.children) }
    }
    walk(roots)
    return flat
  }, [roots])

  const totalRemanente = useMemo(() =>
    allNodes.reduce((s, c) => s + (Math.round(c.percentage) === 100 && c.available > 0 ? c.available : 0), 0)
  , [allNodes])

  const totalExcess = roots.reduce((s, p) => s + p.excess, 0)

  const sortedMonths = useMemo(() => [...allMonths].sort((a, b) => a.month.localeCompare(b.month)), [allMonths])
  const currentIndex = sortedMonths.findIndex((m) => m.id === id)
  const prevMonth = currentIndex > 0 ? sortedMonths[currentIndex - 1] : null
  const nextMonth = currentIndex >= 0 && currentIndex < sortedMonths.length - 1 ? sortedMonths[currentIndex + 1] : null

  const goMonth = (mid: string) => router.replace({ pathname: "/presupuesto-detalle", params: { id: mid } })

  const noChildrenParentIds = new Set(roots.filter((r) => r.children.length === 0).map((r) => r.id))
  const allExpanded = roots.filter((r) => r.children.length > 0).length > 0 && roots.filter((r) => r.children.length > 0).every((r) => expanded.has(r.id))

  const numCell = (value: number, extra: { color?: string; bold?: boolean } = {}) => (
    <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 6, justifyContent: "center", alignItems: "flex-end" }}>
      <Text style={{ fontSize: 10, color: extra.color ?? "#334155", fontWeight: extra.bold ? "600" : "400", fontVariant: ["tabular-nums"] }} numberOfLines={1}>{formatCurrency(value)}</Text>
    </View>
  )

  const actionsCell = (cat: MonthCategoryNode, isChild: boolean) => {
    const showPaid = isChild || noChildrenParentIds.has(cat.id)
    return (
      <View style={{ width: COL_WIDTHS.actions, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 3, gap: 1 }}>
        {showPaid && (
          <TouchableOpacity onPress={() => togglePaid(cat)} style={{ padding: 2 }}>
            <CheckCircle2 size={15} color={cat.is_paid ? "#059669" : "#cbd5e1"} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => openAddSubDialog(cat)} style={{ padding: 2 }}>
          <Plus size={15} color="#4f46e5" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openEdit(cat)} style={{ padding: 2 }}>
          <Pencil size={13} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteCat(cat)} style={{ padding: 2 }}>
          <Trash2 size={13} color="#e11d48" />
        </TouchableOpacity>
      </View>
    )
  }

  const openAddSubDialog = (cat: MonthCategoryNode) => {
    setAddSubParent(cat); setSubName(""); setSubBudgeted(""); setSubModalOpen(true)
  }

  const renderRow = (cat: MonthCategoryNode, isChild: boolean, depth: number) => {
    const hasChildren = cat.children.length > 0
    const isExpanded = expanded.has(cat.id)
    const ppct = cat.percentage === Infinity ? 0 : Math.round(cat.percentage)
    return (
      <View key={cat.id}>
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", backgroundColor: isChild ? "#f8fafc" : "#f1f5f9" }}>
          <View style={{ width: COL_WIDTHS.name, paddingHorizontal: 6, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 6 + depth * 14 }}>
            {hasChildren ? (
              <TouchableOpacity onPress={() => toggle(cat.id)} style={{ padding: 1 }}>
                {isExpanded ? <ChevronDown size={13} color="#94a3b8" /> : <ChevronRight size={13} color="#94a3b8" />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => openAddExpense(cat)} style={{ padding: 1 }}>
                <Text style={{ fontSize: 11, lineHeight: 13 }}>➕</Text>
              </TouchableOpacity>
            )}
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.status === "green" ? "#22c55e" : cat.status === "yellow" ? "#eab308" : "#ef4444" }} />
            <Text style={{ fontSize: 10, fontWeight: isChild ? "400" : "700", color: "#1e293b", flexShrink: 1 }} numberOfLines={1}>{cat.name}</Text>
          </View>
          {numCell(cat.budgeted)}
          {numCell(cat.spent, { bold: true })}
          {numCell(cat.available, { color: cat.available <= 0 ? "#dc2626" : "#334155", bold: true })}
          <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 6, justifyContent: "center", alignItems: "flex-end" }}>
            {Math.round(cat.percentage) === 100 && cat.available > 0 ? (
              <Text style={{ fontSize: 10, fontWeight: "600", color: "#047857", fontVariant: ["tabular-nums"] }} numberOfLines={1}>{formatCurrency(cat.available)}</Text>
            ) : (
              <Text style={{ fontSize: 10, color: "#94a3b8", fontVariant: ["tabular-nums"] }}>{emDash}</Text>
            )}
          </View>
          <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 6, justifyContent: "center", alignItems: "flex-end" }}>
            {cat.excess > 0 ? (
              <Text style={{ fontSize: 10, fontWeight: "600", color: "#dc2626", fontVariant: ["tabular-nums"] }} numberOfLines={1}>{formatCurrency(cat.excess)}</Text>
            ) : (
              <Text style={{ fontSize: 10, color: "#94a3b8", fontVariant: ["tabular-nums"] }}>{emDash}</Text>
            )}
          </View>
          <View style={{ width: COL_WIDTHS.status, paddingHorizontal: 5, paddingVertical: 6, justifyContent: "center", alignItems: "center" }}>
            {pctChip(ppct, cat.is_paid)}
          </View>
          {actionsCell(cat, isChild)}
        </View>
        {hasChildren && isExpanded && cat.children.map((child) => renderRow(child, true, depth + 1))}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }

  if (!monthlyBudget) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", paddingTop: insets.top }}>
        <Text style={{ fontSize: 14, color: "#94a3b8" }}>Presupuesto no encontrado</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc", paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={18} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => prevMonth && goMonth(prevMonth.id)} disabled={!prevMonth} style={{ padding: 2 }}>
          <ChevronLeft size={18} color={prevMonth ? "#64748b" : "#d1d5db"} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }} numberOfLines={1}>{capitalize(formatMonth(monthlyBudget.month))}</Text>
          <Text style={{ fontSize: 10, color: "#94a3b8" }} numberOfLines={1}>· {monthlyBudget.templateName}</Text>
        </View>
        <TouchableOpacity onPress={() => nextMonth && goMonth(nextMonth.id)} disabled={!nextMonth} style={{ padding: 2 }}>
          <ChevronRight size={18} color={nextMonth ? "#64748b" : "#d1d5db"} />
        </TouchableOpacity>
      </View>

      {loadError ? (
        <View style={{ marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#fecaca", borderRadius: 12, backgroundColor: "#fff1f2", paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ fontSize: 11, color: "#be123c" }}>{loadError}</Text>
        </View>
      ) : null}

      {/* Resumen del mes */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, color: "#64748b" }}>Ingresos</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#059669" }}>{formatCurrency(totalIngresos)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, color: "#64748b" }}>Presupuestado</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#2563eb" }}>{formatCurrency(totalBudgeted)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, color: "#64748b" }}>Gastado</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#dc2626" }}>{formatCurrency(totalGastos)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, color: "#64748b" }}>Disponible</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: totalAvailable >= 0 ? "#059669" : "#dc2626" }}>{formatCurrency(totalAvailable)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, color: "#64748b" }}>Remanente</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#047857" }}>{formatCurrency(totalRemanente)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, color: "#64748b" }}>Balance</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: balance >= 0 ? "#059669" : "#dc2626" }}>{formatCurrency(balance)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, color: "#64748b" }}>Exceso</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#dc2626" }}>{formatCurrency(totalExcess)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 8, gap: 8 }}>
        <Text style={{ fontSize: 10, color: "#94a3b8" }}>Ediciones aquí solo afectan a este mes.</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => { if (allExpanded) setExpanded(new Set()); else setExpanded(new Set(roots.filter((r) => r.children.length > 0).map((r) => r.id))) }}>
            <Text style={{ fontSize: 11, color: "#64748b" }}>{allExpanded ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setRootName(""); setRootBudgeted(""); setRootModalOpen(true) }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#4f46e5" }}>+ Agregar rubro</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ minWidth: 150 + COL_WIDTHS.num * 4 + COL_WIDTHS.status + COL_WIDTHS.actions }}>
            {/* Cabecera */}
            <View style={{ flexDirection: "row", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, overflow: "hidden" }}>
              <View style={{ width: COL_WIDTHS.name, paddingHorizontal: 6, paddingVertical: 6, backgroundColor: "#eef2ff" }}>
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Rubro</Text>
              </View>
              <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 6, backgroundColor: "#eef2ff", alignItems: "flex-end" }}>
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Ppto</Text>
              </View>
              <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 6, backgroundColor: "#eef2ff", alignItems: "flex-end" }}>
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Gastado</Text>
              </View>
              <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 6, backgroundColor: "#eef2ff", alignItems: "flex-end" }}>
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Disp</Text>
              </View>
              <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 6, backgroundColor: "#eef2ff", alignItems: "flex-end" }}>
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Rem</Text>
              </View>
              <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 6, backgroundColor: "#eef2ff", alignItems: "flex-end" }}>
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Exc</Text>
              </View>
              <View style={{ width: COL_WIDTHS.status, paddingHorizontal: 5, paddingVertical: 6, backgroundColor: "#eef2ff", alignItems: "center" }}>
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Estado</Text>
              </View>
              <View style={{ width: COL_WIDTHS.actions, paddingHorizontal: 3, paddingVertical: 6, backgroundColor: "#eef2ff" }} />
            </View>

            <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: "#e2e8f0", borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: "hidden" }}>
              {roots.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Text style={{ fontSize: 12, color: "#94a3b8" }}>No hay categorías en este presupuesto</Text>
                </View>
              ) : (
                roots.map((parent) => renderRow(parent, false, 0))
              )}

              {/* Totales */}
              <View style={{ flexDirection: "row", borderTopWidth: 2, borderTopColor: "#cbd5e1", backgroundColor: "#e2e8f0" }}>
                <View style={{ width: COL_WIDTHS.name, paddingHorizontal: 6, paddingVertical: 7, justifyContent: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#1e293b" }}>Totales</Text>
                </View>
                {numCell(totalBudgeted, { bold: true })}
                {numCell(totalGastos, { bold: true })}
                <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 7, justifyContent: "center", alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: totalAvailable < 0 ? "#dc2626" : "#1e293b", fontVariant: ["tabular-nums"] }} numberOfLines={1}>{formatCurrency(totalAvailable)}</Text>
                </View>
                <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 7, justifyContent: "center", alignItems: "flex-end" }}>
                  {totalRemanente > 0 ? (
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#047857", fontVariant: ["tabular-nums"] }} numberOfLines={1}>{formatCurrency(totalRemanente)}</Text>
                  ) : (
                    <Text style={{ fontSize: 10, color: "#94a3b8", fontVariant: ["tabular-nums"] }}>{emDash}</Text>
                  )}
                </View>
                <View style={{ width: COL_WIDTHS.num, paddingHorizontal: 5, paddingVertical: 7, justifyContent: "center", alignItems: "flex-end" }}>
                  {totalExcess > 0 ? (
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#dc2626", fontVariant: ["tabular-nums"] }} numberOfLines={1}>{formatCurrency(totalExcess)}</Text>
                  ) : (
                    <Text style={{ fontSize: 10, color: "#94a3b8", fontVariant: ["tabular-nums"] }}>{emDash}</Text>
                  )}
                </View>
                <View style={{ width: COL_WIDTHS.status }} />
                <View style={{ width: COL_WIDTHS.actions }} />
              </View>
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* Modal Gastos */}
      <Modal visible={expenseModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingBottom: insets.bottom + 20 }}>
            <View style={{ width: 36, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, alignSelf: "center", marginBottom: 12 }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1e293b" }}>Agregar gasto</Text>
              <TouchableOpacity onPress={() => setExpenseModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: "#4f46e5", fontWeight: "600", marginBottom: 12 }}>{expCatName}</Text>

            <Text style={{ fontSize: 11, fontWeight: "500", color: "#475569", marginBottom: 4 }}>Persona</Text>
            <ScrollView style={{ maxHeight: 120, marginBottom: 8 }} nestedScrollEnabled>
              {people.map((p: Person) => {
                const selected = expPerson === p.id
                return (
                  <TouchableOpacity key={p.id} onPress={() => setExpPerson(p.id)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: selected ? "#4f46e5" : "white", borderWidth: selected ? 0 : 1, borderColor: "#cbd5e1", marginRight: 8, alignItems: "center", justifyContent: "center" }}>
                      {selected && <Text style={{ color: "white", fontSize: 10 }}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 13, color: "#334155" }}>{p.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            <Text style={{ fontSize: 11, fontWeight: "500", color: "#475569", marginBottom: 4 }}>Monto</Text>
            <TextInput placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" value={expAmount} onChangeText={setExpAmount} style={{ height: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 8 }} />
            <Text style={{ fontSize: 11, fontWeight: "500", color: "#475569", marginBottom: 4 }}>Descripción (opcional)</Text>
            <TextInput placeholder={expCatName} placeholderTextColor="#cbd5e1" value={expDesc} onChangeText={setExpDesc} style={{ height: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 8 }} />
            <Text style={{ fontSize: 11, fontWeight: "500", color: "#475569", marginBottom: 4 }}>Fecha (AAAA-MM-DD)</Text>
            <TextInput placeholder="2026-08-17" placeholderTextColor="#94a3b8" value={expDate} onChangeText={setExpDate} style={{ height: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 12 }} />
            <TouchableOpacity onPress={handleExpenseSubmit} disabled={submitting} style={{ height: 44, borderRadius: 12, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" }}>
              {submitting ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 14, fontWeight: "600", color: "white" }}>Guardar gasto</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={editModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>Editar rubro</Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569", marginBottom: 4 }}>Nombre</Text>
            <TextInput value={editName} onChangeText={setEditName} style={{ height: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 8 }} />
            {!editHasChildren && (
              <>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569", marginBottom: 4 }}>Monto presupuestado</Text>
                <TextInput keyboardType="decimal-pad" value={editBudgeted} onChangeText={setEditBudgeted} style={{ height: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 8 }} />
              </>
            )}
            {editHasChildren && <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>Calculado automáticamente de las subcategorías.</Text>}
            <Text style={{ fontSize: 10, color: "#94a3b8", marginBottom: 12 }}>Solo afecta a este mes.</Text>
            <TouchableOpacity onPress={handleEditSubmit} disabled={submitting} style={{ height: 44, borderRadius: 12, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" }}>
              {submitting ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 14, fontWeight: "600", color: "white" }}>Guardar cambios</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={rootModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>Nuevo rubro</Text>
              <TouchableOpacity onPress={() => setRootModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569", marginBottom: 4 }}>Nombre</Text>
            <TextInput placeholder="Ej: Transporte" placeholderTextColor="#94a3b8" value={rootName} onChangeText={setRootName} style={{ height: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 8 }} />
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569", marginBottom: 4 }}>Monto presupuestado</Text>
            <TextInput keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#94a3b8" value={rootBudgeted} onChangeText={setRootBudgeted} style={{ height: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 8 }} />
            <Text style={{ fontSize: 10, color: "#94a3b8", marginBottom: 12 }}>Se agrega solo a este mes.</Text>
            <TouchableOpacity onPress={handleAddRootSubmit} disabled={submitting} style={{ height: 44, borderRadius: 12, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" }}>
              {submitting ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 14, fontWeight: "600", color: "white" }}>Agregar rubro</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={subModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>Nueva subcategoría</Text>
              <TouchableOpacity onPress={() => setSubModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: "#4f46e5", fontWeight: "600", marginBottom: 12 }}>Dentro de: {addSubParent?.name}</Text>
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569", marginBottom: 4 }}>Nombre</Text>
            <TextInput placeholder="Ej: Internet" placeholderTextColor="#94a3b8" value={subName} onChangeText={setSubName} style={{ height: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 8 }} />
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569", marginBottom: 4 }}>Monto presupuestado</Text>
            <TextInput keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#94a3b8" value={subBudgeted} onChangeText={setSubBudgeted} style={{ height: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 12 }} />
            <TouchableOpacity onPress={handleAddSubSubmit} disabled={submitting} style={{ height: 44, borderRadius: 12, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" }}>
              {submitting ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 14, fontWeight: "600", color: "white" }}>Agregar subcategoría</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}