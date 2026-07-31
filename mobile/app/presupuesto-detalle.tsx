import { useLocalSearchParams, router } from "expo-router"
import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getMonthlyBudgetDashboard, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory, type MonthCategoryNode } from "@/services/api"
import { formatCurrency, formatMonth } from "@/utils/format"
import { X, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react-native"

export default function PresupuestoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const [monthlyBudget, setMonthlyBudget] = useState<{ month: string; templateName: string } | null>(null)
  const [roots, setRoots] = useState<MonthCategoryNode[]>([])
  const [totalBudgeted, setTotalBudgeted] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
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

  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoadError(null)
      const data = await getMonthlyBudgetDashboard(id)
      setMonthlyBudget({ month: data.month, templateName: data.templateName })
      setRoots(data.categories)
      setTotalBudgeted(data.totalBudgeted)
      setTotalSpent(data.totalGastos)
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
        try {
          await deleteBudgetCategory(cat.id)
          await load()
        } catch { Alert.alert("Error", "No se pudo eliminar.") }
      }},
    ])
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
          · {monthlyBudget.templateName}
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
                <View className="flex-row items-center px-3 py-2.5">
                  <TouchableOpacity
                    onPress={() => hasChildren && toggle(parent.id)}
                    className="flex-1 flex-row items-center"
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
                  <View className="flex-row items-center gap-0.5 ml-1.5">
                    <TouchableOpacity onPress={() => { setAddSubParent(parent); setSubName(""); setSubBudgeted(""); setSubModalOpen(true) }} className="p-1"><Plus size={12} color="#4f46e5" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => openEdit(parent)} className="p-1"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCat(parent)} className="p-1"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
                  </View>
                </View>

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
                          <View className="flex-row items-center gap-0.5 ml-1.5">
                            <TouchableOpacity onPress={() => openEdit(child)} className="p-1"><Pencil size={10} color="#94a3b8" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteCat(child)} className="p-1"><Trash2 size={10} color="#e11d48" /></TouchableOpacity>
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
        <TouchableOpacity onPress={() => { setRootName(""); setRootBudgeted(""); setRootModalOpen(true) }} className="flex-row items-center justify-center gap-1.5 py-3">
          <Plus size={12} color="#4f46e5" /><Text className="text-xs font-medium text-indigo-600">Agregar rubro (este mes)</Text>
        </TouchableOpacity>
        <View className="h-8" />
      </ScrollView>

      <Modal visible={editModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">Editar rubro</Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View className="space-y-3">
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Nombre</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" value={editName} onChangeText={setEditName} />
              </View>
              {!editHasChildren && (
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Monto presupuestado</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" value={editBudgeted} onChangeText={setEditBudgeted} keyboardType="decimal-pad" />
                </View>
              )}
              <Text className="text-[10px] text-slate-400">Solo afecta a este mes.</Text>
            </View>
            <TouchableOpacity onPress={handleEditSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">Guardar cambios</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={rootModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">Nuevo rubro</Text>
              <TouchableOpacity onPress={() => setRootModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View className="space-y-3">
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Nombre</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Ej: Transporte" placeholderTextColor="#94a3b8" value={rootName} onChangeText={setRootName} />
              </View>
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Monto presupuestado</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={rootBudgeted} onChangeText={setRootBudgeted} keyboardType="decimal-pad" />
              </View>
              <Text className="text-[10px] text-slate-400">Se agrega solo a este mes.</Text>
            </View>
            <TouchableOpacity onPress={handleAddRootSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">Agregar rubro</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={subModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">Nueva subcategoría</Text>
              <TouchableOpacity onPress={() => setSubModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View className="space-y-3">
              <Text className="text-[10px] text-indigo-500">Dentro de: {addSubParent?.name}</Text>
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Nombre</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Ej: Internet" placeholderTextColor="#94a3b8" value={subName} onChangeText={setSubName} />
              </View>
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Monto presupuestado</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={subBudgeted} onChangeText={setSubBudgeted} keyboardType="decimal-pad" />
              </View>
            </View>
            <TouchableOpacity onPress={handleAddSubSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">Agregar subcategoría</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
