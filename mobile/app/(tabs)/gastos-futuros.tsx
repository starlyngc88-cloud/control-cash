import { useEffect, useState, useCallback, useMemo } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useAuth } from "@/providers/AuthProvider"
import { getFutureExpenses, getFutureExpenseCategories, createFutureExpense, createFutureExpenseCategory, updateFutureExpense, updateFutureExpenseCategory, deleteFutureExpense, deleteFutureExpenseCategory, updateFutureExpenseStatus, completeFutureExpense, getPeople, getSavings, type FutureExpenseWithRelations, type SavingWithRelations } from "@/services/api"
import { formatCurrency } from "@/utils/format"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { Plus, CalendarClock, Pencil, Trash2, Search, X, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react-native"
import type { FutureExpenseCategory, Person } from "@/types/database"

const STATUS_LABELS: Record<string, string> = { planned: "Planeado", completed: "Completado", cancelled: "Cancelado" }

export default function GastosFuturosScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { person: authPerson } = useAuth()
  const [items, setItems] = useState<FutureExpenseWithRelations[]>([])
  const [categories, setCategories] = useState<FutureExpenseCategory[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [savings, setSavings] = useState<SavingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editing, setEditing] = useState<FutureExpenseWithRelations | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [completeId, setCompleteId] = useState<string | null>(null)
  const [completePersonId, setCompletePersonId] = useState("")
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const [catManagerName, setCatManagerName] = useState("")
  const [editingCat, setEditingCat] = useState<FutureExpenseCategory | null>(null)
  const [catDeleteTarget, setCatDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [catDeleteExpenses, setCatDeleteExpenses] = useState<FutureExpenseWithRelations[]>([])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split("T")[0])
  const [planCuota, setPlanCuota] = useState("")
  const [savingId, setSavingId] = useState("")

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const [fe, cats] = await Promise.all([getFutureExpenses(), getFutureExpenseCategories()])
      setItems(fe)
      setCategories(cats)
      getSavings().then((s) => setSavings(s)).catch(() => {})
      getPeople().then((p) => setPeople(p)).catch(() => {})
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

  useRealtimeSubscription("future_expenses", () => load(), () => load(), () => load())

  const catNameMap = Object.fromEntries(categories.map((c: FutureExpenseCategory) => [c.id, c.name]))

  const openNew = () => {
    setEditing(null); setTitle(""); setDescription(""); setCategoryId(""); setExpectedAmount(""); setExpectedDate(new Date().toISOString().split("T")[0]); setPlanCuota(""); setSavingId(""); setModalOpen(true)
  }

  const openEdit = (item: FutureExpenseWithRelations) => {
    setEditing(item); setTitle(item.title); setDescription(item.description ?? ""); setCategoryId(item.category_id ?? ""); setExpectedAmount(String(item.expected_amount)); setExpectedDate(item.expected_date); setPlanCuota(""); setSavingId(item.saving_id ?? ""); setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !expectedAmount) { Alert.alert("Error", "Completá título y monto."); return }
    setSubmitting(true)
    try {
      const catName = categoryId ? catNameMap[categoryId] ?? "" : ""
      const data = { title: title.trim(), description: description.trim(), category: catName, category_id: categoryId || null, expected_amount: parseFloat(expectedAmount), expected_date: expectedDate, saving_id: savingId || null }
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
    if (status === "completed") {
      const item = items.find((i) => i.id === id)
      if (!item?.saving_id) { Alert.alert("Error", "Este gasto futuro no tiene hucha vinculada."); return }
      const balance = Number(item.savings?.current_amount ?? 0)
      const target = Number(item.expected_amount)
      if (balance < target) { Alert.alert("Objetivo incompleto", `El objetivo aún no está completo. Llevás ${formatCurrency(balance)} de ${formatCurrency(target)}.`); return }
      setCompleteId(id); setCompletePersonId(authPerson?.id ?? "")
      return
    }
    Alert.alert("Cambiar estado", `¿Marcar como "${STATUS_LABELS[status]}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "OK", onPress: async () => { await updateFutureExpenseStatus(id, status); load() }},
    ])
  }

  const handleCompleteConfirm = async () => {
    if (!completeId || !completePersonId) { Alert.alert("Error", "Seleccioná una persona."); return }
    setSubmitting(true)
    try {
      await completeFutureExpense(completeId, completePersonId)
      setCompleteId(null); setCompletePersonId(""); load()
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo completar el objetivo.")
    } finally { setSubmitting(false) }
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

  const openCatManager = () => {
    setEditingCat(null); setCatManagerName(""); setCatModalOpen(true)
  }

  const handleCatSubmit = async () => {
    if (!catManagerName.trim()) return
    setSubmitting(true)
    try {
      if (editingCat) {
        await updateFutureExpenseCategory(editingCat.id, { name: catManagerName.trim() })
      } else {
        await createFutureExpenseCategory({ name: catManagerName.trim() })
      }
      setCatModalOpen(false); setCatManagerName(""); setEditingCat(null)
      const cats = await getFutureExpenseCategories()
      setCategories(cats)
      load()
    } catch { Alert.alert("Error", "No se pudo guardar la categoría.") }
    finally { setSubmitting(false) }
  }

  const handleDeleteCat = (id: string, catName: string) => {
    const related = items.filter((e) => e.category_id === id)
    setCatDeleteExpenses(related)
    setCatDeleteTarget({ id, name: catName })
  }

  const confirmDeleteCat = async () => {
    if (!catDeleteTarget) return
    setSubmitting(true)
    try {
      for (const fe of catDeleteExpenses) await deleteFutureExpense(fe.id)
      await deleteFutureExpenseCategory(catDeleteTarget.id)
      setCatDeleteTarget(null); setCatDeleteExpenses([])
      const cats = await getFutureExpenseCategories()
      setCategories(cats)
      if (categoryId === catDeleteTarget.id) setCategoryId("")
      load()
    } catch { Alert.alert("Error", "No se pudo eliminar la categoría.") }
    finally { setSubmitting(false) }
  }

  const planCalc = useMemo(() => {
    if (!expectedAmount) return null
    const target = parseFloat(expectedAmount)
    if (!target) return null
    if (expectedDate) {
      const now = new Date()
      const end = new Date(expectedDate)
      const diff = end.getTime() - now.getTime()
      if (diff <= 0) return null
      const months = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30.44)))
      return { cuota: target / months, meses: months, type: "fecha" as const }
    }
    if (planCuota) {
      const cuota = parseFloat(planCuota)
      if (!cuota) return null
      const meses = Math.ceil(target / cuota)
      const end = new Date()
      end.setMonth(end.getMonth() + meses)
      return { meses, type: "cuota" as const, fechaEst: end.toLocaleDateString("es-CO") }
    }
    return null
  }, [expectedAmount, expectedDate, planCuota])

  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const dueSoon30 = items.filter((fe: FutureExpenseWithRelations) => fe.expected_date && new Date(fe.expected_date) <= in30 && fe.status === "planned")
  const dueSoon90 = items.filter((fe: FutureExpenseWithRelations) => fe.expected_date && new Date(fe.expected_date) <= in90 && fe.status === "planned")
  const filtered = items.filter((fe: FutureExpenseWithRelations) => !search || fe.title?.toLowerCase().includes(search.toLowerCase()) || fe.description?.toLowerCase().includes(search.toLowerCase()) || fe.future_expense_categories?.name?.toLowerCase().includes(search.toLowerCase()))

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string | null; name: string; items: FutureExpenseWithRelations[] }>()
    for (const c of categories) {
      map.set(c.id, { id: c.id, name: c.name, items: [] })
    }
    for (const fe of filtered) {
      const catId = fe.category_id ?? "__none__"
      const catName = fe.future_expense_categories?.name || "Sin categoría"
      if (!map.has(catId)) map.set(catId, { id: fe.category_id ?? null, name: catName, items: [] })
      map.get(catId)!.items.push(fe)
    }
    return map
  }, [filtered, categories])

  const allExpanded = [...grouped.keys()].length > 0 && [...grouped.keys()].every((k) => expandedCats.has(k))
  const hasItems = items.length > 0 || categories.length > 0

  if (loading) return (
    <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  )

  const renderRow = (item: FutureExpenseWithRelations) => {
    const urgency = getUrgency(item.expected_date)
    const linkedBalance = Number(item.savings?.current_amount ?? 0)
    const target = Number(item.expected_amount)
    const progress = target > 0 ? Math.min(linkedBalance / target, 1) : 0
    const showProgress = Boolean(item.saving_id) && item.status === "planned"
    return (
      <View key={item.id} className={`flex-row items-center px-4 py-2 border-b border-slate-100 last:border-b-0 ${urgency.bg}`}>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2">
            <View className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
            <View className="min-w-0">
              <Text className="text-xs font-medium text-slate-900 truncate">{item.title}</Text>
              <Text className="text-[10px] text-slate-500">
                {new Date(item.expected_date).toLocaleDateString("es-CO")}{item.status === "completed" ? ` · ${STATUS_LABELS.completed}` : ""}
              </Text>
              {showProgress ? (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Text className="text-[10px] text-indigo-600">Abonado {formatCurrency(linkedBalance)} / {formatCurrency(target)}</Text>
                  <View className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <View className={`h-full rounded-full ${progress >= 1 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${progress * 100}%` }} />
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View className="flex-row items-center gap-1.5 shrink-0 ml-3">
          {item.status === "planned" && (
            <>
              <TouchableOpacity onPress={() => handleStatusChange(item.id, "completed")} className="p-1">
                <CheckCircle2 size={14} color="#059669" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openEdit(item)} className="p-1"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-1"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
          <Text className="text-xs font-semibold text-rose-600 tabular-nums w-24 text-right">{formatCurrency(Number(item.expected_amount))}</Text>
        </View>
      </View>
    )
  }

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

      <View className="gap-2 mx-4 mb-3">
        <View className="flex-row gap-3">
          <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Total previsto</Text>
            <Text className="text-sm font-bold text-rose-600">{formatCurrency(items.filter((i: FutureExpenseWithRelations) => i.status === "planned").reduce((s: number, i: FutureExpenseWithRelations) => s + Number(i.expected_amount), 0))}</Text>
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
        <TouchableOpacity onPress={openCatManager} className="flex-row items-center gap-1.5 mb-3">
          <Plus size={12} color="#4f46e5" /><Text className="text-xs font-medium text-indigo-600">Agregar categoría</Text>
        </TouchableOpacity>

        {!hasItems ? (
          <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
            <CalendarClock size={32} color="#cbd5e1" />
            <Text className="text-xs text-slate-400 mt-2">{search ? "Sin resultados" : "Sin gastos futuros"}</Text>
          </View>
        ) : (
          <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Gastos por categoría</Text>
              <View className="flex-row items-center gap-3">
                {grouped.size > 0 && (
                  <TouchableOpacity onPress={() => { if (allExpanded) setExpandedCats(new Set()); else setExpandedCats(new Set(grouped.keys())) }}>
                    <Text className="text-[10px] text-slate-400 underline">{allExpanded ? "Contraer todo" : "Expandir todo"}</Text>
                  </TouchableOpacity>
                )}
                <Text className="text-xs font-bold text-rose-600 tabular-nums">{formatCurrency(filtered.reduce((s: number, i: FutureExpenseWithRelations) => s + Number(i.expected_amount), 0))}</Text>
              </View>
            </View>

            {Array.from(grouped.entries()).map(([key, group]) => {
              const isExpanded = expandedCats.has(key)
              const catTotal = group.items.reduce((s: number, e: FutureExpenseWithRelations) => s + Number(e.expected_amount), 0)
              const cat = categories.find((c) => c.id === group.id)
              return (
                <View key={key}>
                  <View className="flex-row items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <TouchableOpacity onPress={() => setExpandedCats((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })} className="mr-2">
                      {isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                    </TouchableOpacity>
                    {cat && (
                      <>
                        <TouchableOpacity onPress={() => { setEditingCat(cat); setCatManagerName(cat.name); setCatModalOpen(true) }} className="p-0.5 mr-0.5">
                          <Pencil size={12} color="#94a3b8" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteCat(cat.id, cat.name)} className="p-0.5 mr-0.5">
                          <Trash2 size={12} color="#e11d48" />
                        </TouchableOpacity>
                      </>
                    )}
                    <Text className="flex-1 text-xs font-semibold text-slate-700 uppercase tracking-wider">{group.name}</Text>
                    <Text className="text-[10px] text-slate-400 ml-1.5">({group.items.length})</Text>
                    <Text className="ml-auto text-xs font-semibold text-rose-600 tabular-nums">{formatCurrency(catTotal)}</Text>
                  </View>
                  {isExpanded && group.items.map(renderRow)}
                </View>
              )
            })}

            <View className="bg-white px-4 py-2.5 border-t border-slate-200 items-end">
              <TouchableOpacity onPress={openNew} className="flex-row items-center gap-1">
                <Plus size={13} color="#4f46e5" /><Text className="text-xs text-indigo-600 font-medium">Nuevo gasto futuro</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

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
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Ahorro mensual (opcional)</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0.00" placeholderTextColor="#94a3b8" value={planCuota} onChangeText={setPlanCuota} keyboardType="decimal-pad" />
                </View>
                {planCalc ? (
                  <View className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                    {planCalc.type === "fecha" ? (
                      <Text className="text-[11px] text-amber-800">Necesitas ahorrar <Text className="font-bold">{formatCurrency(planCalc.cuota)}</Text> por mes durante <Text className="font-bold">{planCalc.meses} meses</Text></Text>
                    ) : (
                      <Text className="text-[11px] text-amber-800">Ahorrando <Text className="font-bold">{formatCurrency(parseFloat(planCuota || "0"))}</Text> por mes, alcanzas la meta en <Text className="font-bold">{planCalc.meses} meses</Text> (~{planCalc.fechaEst})</Text>
                    )}
                  </View>
                ) : null}
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Hucha vinculada</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
                    <TouchableOpacity onPress={() => setSavingId("")} className={`mr-1.5 px-3 py-1.5 rounded-xl border ${!savingId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                      <Text className={`text-xs ${!savingId ? "text-white" : "text-slate-400"}`}>Sin hucha</Text>
                    </TouchableOpacity>
                    {savings.filter((s) => !s.saving_categories?.name || s.saving_categories.name !== "Gastos futuros").map((s) => (
                      <TouchableOpacity key={s.id} onPress={() => setSavingId(s.id)} className={`mr-1.5 px-3 py-1.5 rounded-xl border ${savingId === s.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                        <Text className={`text-xs ${savingId === s.id ? "text-white" : "text-slate-600"}`}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text className="text-[10px] text-slate-400">Solo podés vincular huchas que ya creaste en la vista Hucha.</Text>
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
      <Modal visible={catModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editingCat ? "Editar categoría" : "Nueva categoría"}</Text>
              <TouchableOpacity onPress={() => { setCatModalOpen(false); setCatManagerName(""); setEditingCat(null) }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView className="max-h-60 mb-4">
              {categories.length === 0 ? (
                <Text className="text-xs text-slate-400 text-center py-4">Sin categorías aún</Text>
              ) : (
                categories.map((cat) => (
                  <View key={cat.id} className="flex-row items-center justify-between py-2.5 border-b border-slate-100">
                    <Text className="text-xs text-slate-800 flex-1 mr-2" numberOfLines={1}>{cat.name}</Text>
                    <TouchableOpacity onPress={() => { setEditingCat(cat); setCatManagerName(cat.name) }} className="p-1">
                      <Pencil size={13} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCat(cat.id, cat.name)} className="p-1">
                      <Trash2 size={13} color="#e11d48" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            <View className="space-y-3">
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Nombre</Text>
                <TextInput
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800"
                  placeholder="Nombre de la categoría"
                  placeholderTextColor="#94a3b8"
                  value={catManagerName}
                  onChangeText={setCatManagerName}
                />
              </View>
              <TouchableOpacity onPress={handleCatSubmit} disabled={submitting} className="h-10 rounded-xl bg-indigo-600 items-center justify-center">
                {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">{editingCat ? "Guardar cambios" : "Crear categoría"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Category Modal */}
      <Modal visible={!!catDeleteTarget} animationType="fade" transparent>
        <View className="flex-1 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <Text className="text-sm font-semibold text-slate-800 mb-1">Eliminar categoría</Text>
            <Text className="text-[10px] text-slate-400 mb-4">Esta acción no se puede deshacer.</Text>
            <View className="rounded-xl bg-rose-50 px-3 py-2 mb-4">
              <Text className="text-xs text-rose-700">¿Eliminar la categoría <Text className="font-bold">{catDeleteTarget?.name}</Text>?</Text>
              {catDeleteExpenses.length > 0 && (
                <Text className="text-[10px] text-rose-500 mt-1">{catDeleteExpenses.length} gasto{catDeleteExpenses.length !== 1 ? "s" : ""} asociado{catDeleteExpenses.length !== 1 ? "s" : ""} también será{catDeleteExpenses.length !== 1 ? "n" : ""} eliminado{catDeleteExpenses.length !== 1 ? "s" : ""}.</Text>
              )}
            </View>
            {catDeleteExpenses.length > 0 && (
              <ScrollView className="max-h-40 mb-4">
                {catDeleteExpenses.map((fe) => (
                  <View key={fe.id} className="flex-row items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-rose-100 mb-1">
                    <Text className="text-xs text-slate-700 flex-1 mr-2" numberOfLines={1}>{fe.title}</Text>
                    <Text className="text-xs font-semibold text-rose-600 tabular-nums">{formatCurrency(Number(fe.expected_amount))}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setCatDeleteTarget(null)} className="flex-1 h-10 rounded-xl border border-slate-200 items-center justify-center">
                <Text className="text-xs font-semibold text-slate-600">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteCat} disabled={submitting} className="flex-1 h-10 rounded-xl bg-rose-600 items-center justify-center">
                {submitting ? <ActivityIndicator color="white" /> : <Text className="text-xs font-semibold text-white">{catDeleteExpenses.length > 0 ? `Eliminar (${catDeleteExpenses.length} gastos)` : "Eliminar"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Modal */}
      <Modal visible={!!completeId} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <Text className="text-sm font-semibold text-slate-800 mb-1">Completar objetivo</Text>
            <Text className="text-[11px] text-slate-500 mb-4">La hucha irá al disponible al confirmar.</Text>
            <Text className="text-xs font-medium text-slate-600 mb-1">Persona (ingreso al disponible)</Text>
            <View className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              {people.length === 0 ? (
                <Text className="text-xs text-slate-400 px-3 py-3">Sin personas registradas.</Text>
              ) : (
                people.map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => setCompletePersonId(p.id)} className={`px-3 py-2.5 flex-row items-center justify-between ${completePersonId === p.id ? "bg-indigo-50" : ""}`}>
                    <Text className={`text-sm ${completePersonId === p.id ? "text-indigo-700 font-semibold" : "text-slate-700"}`}>{p.name}</Text>
                    {completePersonId === p.id ? <CheckCircle2 size={16} color="#4f46e5" /> : null}
                  </TouchableOpacity>
                ))
              )}
            </View>
            <TouchableOpacity onPress={handleCompleteConfirm} disabled={submitting || !completePersonId} className={`h-11 rounded-xl items-center justify-center ${submitting || !completePersonId ? "bg-slate-200" : "bg-emerald-600"}`}>
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">Completar</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}