import { useEffect, useState, useCallback, useMemo } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/providers/AuthProvider"
import { getIncomes, getPeople, getIncomeCategories, createIncome, updateIncome, deleteIncome, createIncomeCategory, updateIncomeCategory, deleteIncomeCategory, type IncomeWithRelations } from "@/services/api"
import { formatCurrency, toLocalDateString, todayString } from "@/utils/format"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { useMonthFilter } from "@/hooks/useMonthFilter"
import DateFilter from "@/components/DateFilter"
import DatePickerModal from "@/components/DatePickerModal"
import { Plus, TrendingDown, Pencil, Trash2, Search, X, Calendar, ChevronDown, ChevronRight } from "lucide-react-native"
import type { Person, IncomeCategory } from "@/types/database"

export default function IngresosScreen() {
  const insets = useSafeAreaInsets()
  const { person: authPerson } = useAuth()
  const [incomes, setIncomes] = useState<IncomeWithRelations[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<IncomeWithRelations | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const [catManagerName, setCatManagerName] = useState("")
  const [editingCat, setEditingCat] = useState<IncomeCategory | null>(null)
  const [catSelectionPending, setCatSelectionPending] = useState(false)
  const [catDeleteTarget, setCatDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [catDeleteIncomes, setCatDeleteIncomes] = useState<IncomeWithRelations[]>([])

  const { months, setMonths } = useMonthFilter()

  const [personId, setPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(todayString())
  const [categoryId, setCategoryId] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const parsedDate = useMemo(() => new Date(date + "T12:00:00"), [date])

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const sorted = [...months].sort()
      const startDate = sorted.length > 0 ? `${sorted[0]}-01` : undefined
      const endDate = sorted.length > 0 ? (() => {
        const [y, m] = sorted[sorted.length - 1].split("-").map(Number)
        return `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate().toString().padStart(2, "0")}`
      })() : undefined
      const [inc, p, cats] = await Promise.all([getIncomes({ startDate, endDate }), getPeople(), getIncomeCategories()])
      setIncomes(inc)
      setPeople(p)
      setCategories(cats)
    } catch (error) {
      console.error("[KellyCash][Mobile][Ingresos] load failed", error)
      setLoadError("No se pudieron cargar los ingresos. Revisa sesión y configuración de Supabase.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [months])

  useEffect(() => {
    void (async () => { await load() })()
  }, [load])
  useRealtimeSubscription("income", () => load(), () => load(), () => load())

  const openNew = () => {
    setEditing(null)
    setPersonId(authPerson?.id ?? ""); setAmount(""); setDescription(""); setDate(todayString()); setCategoryId("")
    setModalOpen(true)
  }

  const openEdit = (inc: IncomeWithRelations) => {
    setEditing(inc)
    setPersonId(inc.person_id); setAmount(String(inc.amount)); setDescription(inc.description); setDate(inc.date); setCategoryId(inc.category_id ?? "")
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!personId || !amount) { Alert.alert("Error", "Completá persona y monto."); return }
    setSubmitting(true)
    try {
      const data = { person_id: personId, amount: parseFloat(amount), description, date, category_id: categoryId || null }
      if (editing) await updateIncome(editing.id, data)
      else await createIncome(data)
      setModalOpen(false); load()
    } catch { Alert.alert("Error", "No se pudo guardar.") }
    finally { setSubmitting(false) }
  }

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar ingreso", "¿Estás segura?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => { await deleteIncome(id); load() }},
    ])
  }

  const openCatManager = (selectAfter = false) => {
    setEditingCat(null)
    setCatManagerName("")
    setCatSelectionPending(selectAfter)
    setCatManagerOpen(true)
  }

  const handleCatSubmit = async () => {
    if (!catManagerName.trim()) return
    setSubmitting(true)
    try {
      if (editingCat) {
        await updateIncomeCategory(editingCat.id, { name: catManagerName.trim() })
      } else {
        const { data: created } = await createIncomeCategory({ name: catManagerName.trim() })
        if (created && catSelectionPending) setCategoryId(created.id)
      }
      setCatManagerOpen(false)
      setCatSelectionPending(false)
      const cats = await getIncomeCategories()
      setCategories(cats)
      load()
    } catch { Alert.alert("Error", "No se pudo guardar la categoría.") }
    finally { setSubmitting(false) }
  }

  const handleDeleteCat = (id: string, name: string) => {
    const related = incomes.filter((i) => i.category_id === id)
    setCatDeleteIncomes(related)
    setCatDeleteTarget({ id, name })
  }

  const confirmDeleteCat = async () => {
    if (!catDeleteTarget) return
    setSubmitting(true)
    try {
      await deleteIncomeCategory(catDeleteTarget.id)
      setCatDeleteTarget(null)
      setCatDeleteIncomes([])
      const cats = await getIncomeCategories()
      setCategories(cats)
      if (categoryId === catDeleteTarget.id) setCategoryId("")
      load()
    } catch { Alert.alert("Error", "No se pudo eliminar la categoría.") }
    finally { setSubmitting(false) }
  }

  const filtered = incomes.filter((i) => {
    if (search) {
      const q = search.toLowerCase()
      if (!(i.description?.toLowerCase().includes(q) || i.people?.name?.toLowerCase().includes(q) || i.income_categories?.name?.toLowerCase().includes(q))) return false
    }
    return true
  })

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string | null; name: string; items: IncomeWithRelations[] }>()
    for (const c of categories) {
      map.set(c.id, { id: c.id, name: c.name, items: [] })
    }
    for (const inc of filtered) {
      const catId = inc.category_id ?? "__none__"
      const catName = inc.income_categories?.name || "Sin categoría"
      if (!map.has(catId)) map.set(catId, { id: inc.category_id ?? null, name: catName, items: [] })
      map.get(catId)!.items.push(inc)
    }
    return map
  }, [filtered, categories])

  const total = incomes.reduce((s: number, i: IncomeWithRelations) => s + Number(i.amount), 0)
  const masAlto = incomes.reduce((max: IncomeWithRelations | null, i: IncomeWithRelations) => Number(i.amount) > Number(max?.amount ?? 0) ? i : max, incomes[0] ?? null)
  const sinCategoria = incomes.filter((i) => !i.category_id).length
  const allExpanded = [...grouped.keys()].length > 0 && [...grouped.keys()].every((k) => expandedCats.has(k))
  const hasItems = incomes.length > 0 || categories.length > 0

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }

  const renderRow = (inc: IncomeWithRelations) => (
    <View key={inc.id} className="flex-row items-center px-4 py-2 border-b border-slate-100 last:border-b-0">
      <View className="flex-1 flex-row items-center min-w-0">
        <View className="size-7 rounded-full bg-emerald-100 items-center justify-center">
          <TrendingDown size={13} color="#059669" />
        </View>
        <View className="ml-2.5 flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-medium text-slate-900 truncate">{inc.description || "Sin concepto"}</Text>
            <Text className="text-[10px] text-slate-400 shrink-0">{new Date(inc.date + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</Text>
          </View>
          {inc.people?.name ? <Text className="text-[10px] text-slate-500">{inc.people.name}</Text> : null}
        </View>
      </View>
      <View className="flex-row items-center gap-3 shrink-0 ml-3">
        <Text className="text-xs font-semibold text-emerald-600 tabular-nums">+ {formatCurrency(Number(inc.amount))}</Text>
        <TouchableOpacity onPress={() => openEdit(inc)} className="p-0.5"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(inc.id)} className="p-0.5"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Text className="text-lg font-bold text-slate-800">Ingresos</Text>
        <TouchableOpacity onPress={openNew} className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center gap-1.5">
          <Plus size={14} color="white" /><Text className="text-xs font-semibold text-white">Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mb-3">
        <DateFilter months={months} onChange={setMonths} />
      </View>

      <View className="mx-4 mb-3">
        {loadError ? (
          <View className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <Text className="text-[11px] text-rose-700">{loadError}</Text>
          </View>
        ) : null}
        <View className="flex-row items-center bg-white rounded-xl border border-slate-200 px-3 h-9">
          <Search size={14} color="#94a3b8" />
          <TextInput className="flex-1 ml-2 text-xs text-slate-800" placeholder="Buscar ingreso..." placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch("")}><X size={14} color="#94a3b8" /></TouchableOpacity> : null}
        </View>
      </View>

      <View className="flex-row gap-2 mx-4 mb-3">
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-emerald-500 mb-0.5">Total ingresado</Text>
          <Text className="text-sm font-bold text-emerald-600">{formatCurrency(total)}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-emerald-500 mb-0.5">Ingreso récord</Text>
          <Text className="text-sm font-bold text-emerald-600" numberOfLines={1}>{masAlto ? formatCurrency(Number(masAlto.amount)) : "-"}</Text>
        </View>
      </View>
      <View className="flex-row gap-2 mx-4 mb-3">
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Categorías</Text>
          <Text className="text-sm font-bold text-slate-800">{categories.length}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Sin categoría</Text>
          <Text className={`text-sm font-bold ${sinCategoria > 0 ? "text-orange-500" : "text-emerald-600"}`}>{sinCategoria}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}>
        {!hasItems ? (
          <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
            <Text className="text-xs text-slate-400">{search ? "Sin resultados para esa búsqueda" : "Sin ingresos aún"}</Text>
          </View>
        ) : (
          <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ingresos por categoría</Text>
              <View className="flex-row items-center gap-3">
                {grouped.size > 0 && (
                  <TouchableOpacity onPress={() => { if (allExpanded) setExpandedCats(new Set()); else setExpandedCats(new Set(grouped.keys())) }}>
                    <Text className="text-[10px] text-slate-400 underline">{allExpanded ? "Contraer todo" : "Expandir todo"}</Text>
                  </TouchableOpacity>
                )}
                <Text className="text-xs font-bold text-emerald-600 tabular-nums">{formatCurrency(filtered.reduce((s: number, i: IncomeWithRelations) => s + Number(i.amount), 0))}</Text>
              </View>
            </View>

            {Array.from(grouped.entries()).map(([key, group]) => {
              const isExpanded = expandedCats.has(key)
              const catTotal = group.items.reduce((s: number, i: IncomeWithRelations) => s + Number(i.amount), 0)
              const cat = categories.find((c) => c.id === group.id)
              return (
                <View key={key}>
                  <View className="flex-row items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <TouchableOpacity onPress={() => setExpandedCats((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })} className="mr-2">
                      {isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                    </TouchableOpacity>
                    {cat && (
                      <>
                        <TouchableOpacity onPress={() => { setEditingCat(cat); setCatManagerName(cat.name); setCatManagerOpen(true) }} className="p-0.5 mr-0.5">
                          <Pencil size={12} color="#94a3b8" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteCat(cat.id, cat.name)} className="p-0.5 mr-0.5">
                          <Trash2 size={12} color="#e11d48" />
                        </TouchableOpacity>
                      </>
                    )}
                    <Text className="flex-1 text-xs font-semibold text-slate-700 uppercase tracking-wider">{group.name}</Text>
                    <Text className="text-[10px] text-slate-400 ml-1.5">({group.items.length})</Text>
                    <Text className="ml-auto text-xs font-semibold text-emerald-600 tabular-nums">{formatCurrency(catTotal)}</Text>
                  </View>
                  {isExpanded && group.items.map(renderRow)}
                </View>
              )
            })}

            <View className="bg-white px-4 py-2.5 border-t border-slate-200 items-end">
              <TouchableOpacity onPress={openNew} className="flex-row items-center gap-1">
                <Plus size={13} color="#4f46e5" /><Text className="text-xs text-indigo-600 font-medium">Nuevo ingreso</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editing ? "Editar ingreso" : "Nuevo ingreso"}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView className="max-h-96">
              <View className="space-y-3">
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Persona</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {people.map((p) => (
                      <TouchableOpacity key={p.id} onPress={() => setPersonId(p.id)}
                        className={`px-3 py-1.5 rounded-xl border ${personId === p.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                        <Text className={`text-xs ${personId === p.id ? "text-white" : "text-slate-600"}`}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Monto</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Fecha</Text>
                  <TouchableOpacity
                    onPress={() => setDatePickerOpen(true)}
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white flex-row items-center"
                  >
                    <Calendar size={14} color="#94a3b8" />
                    <Text className="ml-2 text-sm text-slate-800">{parsedDate.toLocaleDateString("es-CO")}</Text>
                  </TouchableOpacity>
                  <DatePickerModal
                    date={parsedDate}
                    onChange={(d) => setDate(toLocalDateString(d))}
                    visible={datePickerOpen}
                    onClose={() => setDatePickerOpen(false)}
                  />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Descripción</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="¿De dónde viene?" placeholderTextColor="#94a3b8" value={description} onChangeText={setDescription} />
                </View>
                <View>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs font-medium text-slate-600">Categoría</Text>
                    <TouchableOpacity onPress={() => openCatManager(true)} className="flex-row items-center">
                      <Plus size={12} color="#4f46e5" /><Text className="text-[10px] text-indigo-600 font-medium ml-0.5">Nueva categoría</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row flex-wrap gap-1.5">
                    <TouchableOpacity onPress={() => setCategoryId("")}
                      className={`px-3 py-1.5 rounded-xl border ${!categoryId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                      <Text className={`text-xs ${!categoryId ? "text-white" : "text-slate-400"}`}>Sin categoría</Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                      <TouchableOpacity key={cat.id} onPress={() => setCategoryId(cat.id)}
                        className={`px-3 py-1.5 rounded-xl border ${categoryId === cat.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                        <Text className={`text-xs ${categoryId === cat.id ? "text-white" : "text-slate-600"}`}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity onPress={handleSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">{editing ? "Guardar cambios" : "Crear ingreso"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={catManagerOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editingCat ? "Editar categoría" : "Nueva categoría"}</Text>
              <TouchableOpacity onPress={() => { setCatManagerOpen(false); setCatManagerName(""); setEditingCat(null) }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
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

      <Modal visible={!!catDeleteTarget} animationType="fade" transparent>
        <View className="flex-1 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <Text className="text-sm font-semibold text-slate-800 mb-1">Eliminar categoría</Text>
            <Text className="text-[10px] text-slate-400 mb-4">Esta acción no se puede deshacer.</Text>
            <View className="rounded-xl bg-rose-50 px-3 py-2 mb-4">
              <Text className="text-xs text-rose-700">¿Eliminar la categoría <Text className="font-bold">{catDeleteTarget?.name}</Text>?</Text>
              {catDeleteIncomes.length > 0 && (
                <Text className="text-[10px] text-rose-500 mt-1">Se eliminará la referencia en los ingresos asociados.</Text>
              )}
            </View>
            {catDeleteIncomes.length > 0 && (
              <ScrollView className="max-h-40 mb-4">
                {catDeleteIncomes.map((inc) => (
                  <View key={inc.id} className="flex-row items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-rose-100 mb-1">
                    <Text className="text-xs text-slate-700 flex-1 mr-2" numberOfLines={1}>{inc.description || "Sin concepto"}</Text>
                    <Text className="text-xs font-semibold text-emerald-600 tabular-nums">{formatCurrency(Number(inc.amount))}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setCatDeleteTarget(null)} className="flex-1 h-10 rounded-xl border border-slate-200 items-center justify-center">
                <Text className="text-xs font-semibold text-slate-600">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteCat} disabled={submitting} className="flex-1 h-10 rounded-xl bg-rose-600 items-center justify-center">
                {submitting ? <ActivityIndicator color="white" /> : <Text className="text-xs font-semibold text-white">Eliminar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}