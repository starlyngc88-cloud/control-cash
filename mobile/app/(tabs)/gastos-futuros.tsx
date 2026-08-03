import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { getFutureExpenses, getFutureExpenseCategories, createFutureExpense, createFutureExpenseCategory, updateFutureExpense, deleteFutureExpense, updateFutureExpenseStatus, type FutureExpenseWithRelations } from "@/services/api"
import { formatCurrency } from "@/utils/format"
import { Plus, CalendarClock, Pencil, Trash2, Search, X, Circle, CheckCircle2, Ban, type LucideIcon } from "lucide-react-native"
import type { FutureExpenseCategory } from "@/types/database"

const STATUS_ICONS: Record<string, LucideIcon> = { planned: Circle, completed: CheckCircle2, cancelled: Ban }
const STATUS_COLORS: Record<string, string> = { planned: "#f59e0b", completed: "#059669", cancelled: "#94a3b8" }
const STATUS_LABELS: Record<string, string> = { planned: "Planeado", completed: "Completado", cancelled: "Cancelado" }

export default function GastosFuturosScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [items, setItems] = useState<FutureExpenseWithRelations[]>([])
  const [categories, setCategories] = useState<FutureExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editing, setEditing] = useState<FutureExpenseWithRelations | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split("T")[0])
  const [catName, setCatName] = useState("")

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const [fe, cats] = await Promise.all([getFutureExpenses(), getFutureExpenseCategories()])
      setItems(fe)
      setCategories(cats)
    } catch (error) {
      console.error("[KellyCash][Mobile][GastosFuturos] load failed", error)
      setLoadError("No se pudieron cargar los gastos futuros desde Supabase.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void (async () => { await load() })()
  }, [load])

  const catNameMap = Object.fromEntries(categories.map((c: FutureExpenseCategory) => [c.id, c.name]))

  const openNew = () => {
    setEditing(null); setTitle(""); setDescription(""); setCategoryId(""); setExpectedAmount(""); setExpectedDate(new Date().toISOString().split("T")[0]); setModalOpen(true)
  }

  const openEdit = (item: FutureExpenseWithRelations) => {
    setEditing(item); setTitle(item.title); setDescription(item.description ?? ""); setCategoryId(item.category_id ?? ""); setExpectedAmount(String(item.expected_amount)); setExpectedDate(item.expected_date); setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !expectedAmount) { Alert.alert("Error", "Completá título y monto."); return }
    setSubmitting(true)
    try {
      const catName = categoryId ? catNameMap[categoryId] ?? "" : ""
      const data = { title: title.trim(), description: description.trim(), category: catName, category_id: categoryId || null, expected_amount: parseFloat(expectedAmount), expected_date: expectedDate }
      if (editing) await updateFutureExpense(editing.id, data)
      else await createFutureExpense(data)
      setModalOpen(false); load()
    } catch { Alert.alert("Error", "No se pudo guardar.") }
    finally { setSubmitting(false) }
  }

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar", "¿Estás segura?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => { await deleteFutureExpense(id); load() }},
    ])
  }

  const handleStatusChange = (id: string, status: "planned" | "completed" | "cancelled") => {
    Alert.alert("Cambiar estado", `¿Marcar como "${STATUS_LABELS[status]}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "OK", onPress: async () => { await updateFutureExpenseStatus(id, status); load() }},
    ])
  }

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getUrgency = (dateStr: string) => {
    const d = daysUntil(dateStr)
    if (d < 0) return { bg: "bg-slate-50", dot: "bg-slate-400" }
    if (d <= 30) return { bg: "bg-red-50/50", dot: "bg-red-500" }
    if (d <= 90) return { bg: "bg-amber-50/50", dot: "bg-amber-500" }
    return { bg: "bg-emerald-50/50", dot: "bg-emerald-500" }
  }

  const handleAddCategory = async () => {
    if (!catName.trim()) return
    await createFutureExpenseCategory({ name: catName.trim() })
    setCatName(""); setCatModalOpen(false); load()
  }

  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const dueSoon30 = items.filter((fe: FutureExpenseWithRelations) => fe.expected_date && new Date(fe.expected_date) <= in30 && fe.status === "planned")
  const dueSoon90 = items.filter((fe: FutureExpenseWithRelations) => fe.expected_date && new Date(fe.expected_date) <= in90 && fe.status === "planned")
  const filtered = items.filter((fe: FutureExpenseWithRelations) => !search || fe.title?.toLowerCase().includes(search.toLowerCase()) || fe.description?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return (
    <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  )

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between px-4 mb-3">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.back()}><X size={18} color="#64748b" /></TouchableOpacity>
          <Text className="text-lg font-bold text-slate-800">Gastos Futuros</Text>
        </View>
        <TouchableOpacity onPress={openNew} className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center gap-1.5">
          <Plus size={14} color="white" /><Text className="text-xs font-semibold text-white">Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      {loadError ? (
        <View className="mx-4 mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
          <Text className="text-[11px] text-rose-700">{loadError}</Text>
        </View>
      ) : null}

      <View className="mx-4 mb-3">
        <View className="flex-row items-center bg-white rounded-xl border border-slate-200 px-3 h-9">
          <Search size={14} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-2 text-xs text-slate-800"
            placeholder="Buscar gasto futuro..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* KPI */}
      <View className="gap-2 mx-4 mb-3">
        <View className="flex-row gap-3">
          <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Total previsto</Text>
            <Text className="text-sm font-bold text-slate-800">{formatCurrency(items.reduce((s: number, i: FutureExpenseWithRelations) => s + Number(i.expected_amount), 0))}</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Pendientes</Text>
            <Text className="text-sm font-bold text-amber-600">{items.filter((i: FutureExpenseWithRelations) => i.status === "planned").length}</Text>
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <Text className="text-[10px] font-medium text-indigo-500 mb-0.5">Próximos 30 días</Text>
            <Text className="text-sm font-bold text-indigo-600">{dueSoon30.length}</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <Text className="text-[10px] font-medium text-indigo-500 mb-0.5">Próximos 90 días</Text>
            <Text className="text-sm font-bold text-indigo-600">{dueSoon90.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}>
        {/* Categories inline add */}
        <TouchableOpacity onPress={() => setCatModalOpen(true)} className="flex-row items-center gap-1.5 mb-3">
          <Plus size={12} color="#4f46e5" /><Text className="text-xs font-medium text-indigo-600">Agregar categoría</Text>
        </TouchableOpacity>

        {filtered.length === 0 ? (
          <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
            <CalendarClock size={32} color="#cbd5e1" />
            <Text className="text-xs text-slate-400 mt-2">Sin gastos futuros</Text>
          </View>
        ) : (
          <View className="space-y-2">
            {filtered.map((item: FutureExpenseWithRelations) => {
              const urgency = getUrgency(item.expected_date)
              const StatusIcon = STATUS_ICONS[item.status] ?? Circle
              const statusColor = STATUS_COLORS[item.status] ?? "#94a3b8"
              const d = daysUntil(item.expected_date)
              return (
                <View key={item.id} className={`bg-white rounded-xl p-4 border border-slate-100 shadow-sm ${urgency.bg}`}>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm font-semibold text-slate-800">{item.title}</Text>
                      {item.description ? <Text className="text-[10px] text-slate-400 mt-0.5">{item.description}</Text> : null}
                    </View>
                    <View className="flex-row gap-1">
                      <TouchableOpacity onPress={() => handleStatusChange(item.id, item.status === "planned" ? "completed" : item.status === "completed" ? "cancelled" : "planned")} className="p-1">
                        <StatusIcon size={16} color={statusColor} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openEdit(item)} className="p-1"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-1"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-xs font-semibold text-slate-800">{formatCurrency(Number(item.expected_amount))}</Text>
                    <View className="flex-row items-center gap-1.5">
                      <Text className={`text-[10px] font-medium ${d < 0 ? "text-slate-400" : d <= 30 ? "text-red-500" : d <= 90 ? "text-amber-500" : "text-emerald-500"}`}>
                        {d < 0 ? `Vencido hace ${Math.abs(d)}d` : d === 0 ? "Hoy" : `En ${d}d`}
                      </Text>
                      <View className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
                    </View>
                  </View>
                  <View className="flex-row items-center gap-1.5 mt-1.5">
                    <Text className="text-[10px] text-slate-400">{STATUS_LABELS[item.status]}</Text>
                    {item.future_expense_categories?.name ? (
                      <><Text className="text-[10px] text-slate-300">·</Text><Text className="text-[10px] text-slate-400">{item.future_expense_categories.name}</Text></>
                    ) : null}
                  </View>
                </View>
              )
            })}
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      {/* Footer total */}
      <View className="bg-white border-t border-slate-200 px-4 py-3 flex-row items-center justify-between" style={{ paddingBottom: insets.bottom + 12 }}>
        <Text className="text-xs font-medium text-slate-500">Total visible</Text>
        <Text className="text-sm font-bold text-slate-800">{formatCurrency(filtered.reduce((s: number, i: FutureExpenseWithRelations) => s + Number(i.expected_amount), 0))}</Text>
      </View>

      {/* Item Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editing ? "Editar gasto futuro" : "Nuevo gasto futuro"}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView className="max-h-96">
              <View className="space-y-3">
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Título</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="¿Qué es?" placeholderTextColor="#94a3b8" value={title} onChangeText={setTitle} />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Descripción</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Detalle..." placeholderTextColor="#94a3b8" value={description} onChangeText={setDescription} />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Categoría</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    <TouchableOpacity onPress={() => setCategoryId("")} className={`px-3 py-1.5 rounded-xl border ${!categoryId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                      <Text className={`text-xs ${!categoryId ? "text-white" : "text-slate-400"}`}>Sin categoría</Text>
                    </TouchableOpacity>
                    {categories.map((cat: FutureExpenseCategory) => (
                      <TouchableOpacity key={cat.id} onPress={() => setCategoryId(cat.id)} className={`px-3 py-1.5 rounded-xl border ${categoryId === cat.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                        <Text className={`text-xs ${categoryId === cat.id ? "text-white" : "text-slate-600"}`}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Monto esperado</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={expectedAmount} onChangeText={setExpectedAmount} keyboardType="decimal-pad" />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Fecha esperada</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" value={expectedDate} onChangeText={setExpectedDate} />
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity onPress={handleSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">{editing ? "Guardar cambios" : "Crear"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category Modal */}
      <Modal visible={catModalOpen} animationType="fade" transparent>
        <View className="flex-1 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <Text className="text-sm font-semibold text-slate-800 mb-3">Nueva categoría</Text>
            <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 mb-3" placeholder="Nombre" placeholderTextColor="#94a3b8" value={catName} onChangeText={setCatName} />
            <TouchableOpacity onPress={handleAddCategory} className="h-10 rounded-xl bg-indigo-600 items-center justify-center">
              <Text className="text-sm font-semibold text-white">Agregar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
