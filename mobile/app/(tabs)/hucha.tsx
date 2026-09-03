import { useEffect, useState, useCallback, useMemo } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/providers/AuthProvider"
import { getSavings, createSaving, updateSaving, deleteSaving, createSavingMovement, getSavingsDashboard, getSavingCategories, createSavingCategory, updateSavingCategory, deleteSavingCategory, getFutureExpenses, getPeople, completeFutureExpenseBySaving, type SavingWithRelations } from "@/services/api"
import { formatCurrency } from "@/utils/format"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { Plus, PiggyBank, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, Search, X, CheckCircle2, ChevronDown, ChevronRight, List } from "lucide-react-native"
import type { FutureExpense, Person, SavingCategory } from "@/types/database"

export default function HuchaScreen() {
  const insets = useSafeAreaInsets()
  const { person: authPerson } = useAuth()
  const [savings, setSavings] = useState<SavingWithRelations[]>([])
  const [categories, setCategories] = useState<SavingCategory[]>([])
  const [movementsCount, setMovementsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingModalOpen, setSavingModalOpen] = useState(false)
  const [movementModalOpen, setMovementModalOpen] = useState(false)
  const [editing, setEditing] = useState<SavingWithRelations | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [movementSavingId, setMovementSavingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [futureExpenses, setFutureExpenses] = useState<FutureExpense[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [completeSavingId, setCompleteSavingId] = useState<string | null>(null)
  const [completePersonId, setCompletePersonId] = useState("")
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const [catManagerName, setCatManagerName] = useState("")
  const [editingCat, setEditingCat] = useState<SavingCategory | null>(null)
  const [catDeleteTarget, setCatDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [catDeleteSavings, setCatDeleteSavings] = useState<SavingWithRelations[]>([])

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [savingCategoryId, setSavingCategoryId] = useState("")
  const [movType, setMovType] = useState<"income" | "withdrawal">("income")
  const [movAmount, setMovAmount] = useState("")
  const [movNotes, setMovNotes] = useState("")

  const load = useCallback(async () => {
    const [s, d, cats, fes, p] = await Promise.all([
      getSavings(),
      getSavingsDashboard().catch(() => ({ totalAhorrado: 0, numHuchas: 0, recentMovements: [] })),
      getSavingCategories().catch(() => [] as SavingCategory[]),
      getFutureExpenses().catch(() => [] as FutureExpense[]),
      getPeople().catch(() => [] as Person[]),
    ])
    setSavings(s)
    setMovementsCount(d.recentMovements.length)
    setCategories(cats)
    setFutureExpenses(fes)
    setPeople(p)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void (async () => { await load() })()
  }, [load])
  useRealtimeSubscription("savings", () => load(), () => load(), () => load())

  const openNew = () => {
    setEditing(null); setName(""); setDescription(""); setTargetAmount(""); setSavingCategoryId(""); setSavingModalOpen(true)
  }

  const openEdit = (s: SavingWithRelations) => {
    setEditing(s); setName(s.name); setDescription(s.description ?? ""); setTargetAmount(String(s.target_amount)); setSavingCategoryId(s.category_id ?? ""); setSavingModalOpen(true)
  }

  const handleSavingSubmit = async () => {
    if (!name.trim() || !targetAmount) { Alert.alert("Error", "Completá nombre y meta."); return }
    setSubmitting(true)
    try {
      const data = { name: name.trim(), description: description.trim() || null, target_amount: parseFloat(targetAmount), category_id: savingCategoryId || null }
      if (editing) {
        await updateSaving(editing.id, data)
      } else {
        await createSaving({ ...data, current_amount: 0 })
      }
      setSavingModalOpen(false); load()
    } catch { Alert.alert("Error", "No se pudo guardar.") }
    finally { setSubmitting(false) }
  }

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar hucha", "¿Estás segura?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => { await deleteSaving(id); load() }},
    ])
  }

  const openCatManager = () => {
    setEditingCat(null); setCatManagerName(""); setCatManagerOpen(true)
  }

  const handleCatSubmit = async () => {
    if (!catManagerName.trim()) return
    setSubmitting(true)
    try {
      if (editingCat) {
        await updateSavingCategory(editingCat.id, { name: catManagerName.trim() })
      } else {
        await createSavingCategory({ name: catManagerName.trim() })
      }
      setCatManagerOpen(false); setCatManagerName(""); setEditingCat(null)
      const cats = await getSavingCategories()
      setCategories(cats)
    } catch { Alert.alert("Error", "No se pudo guardar la categoría.") }
    finally { setSubmitting(false) }
  }

  const handleDeleteCat = (id: string, catName: string) => {
    const related = savings.filter((s) => s.category_id === id)
    setCatDeleteSavings(related)
    setCatDeleteTarget({ id, name: catName })
  }

  const confirmDeleteCat = async () => {
    if (!catDeleteTarget) return
    setSubmitting(true)
    try {
      await deleteSavingCategory(catDeleteTarget.id)
      setCatDeleteTarget(null); setCatDeleteSavings([])
      const cats = await getSavingCategories()
      setCategories(cats)
      if (savingCategoryId === catDeleteTarget.id) setSavingCategoryId("")
      load()
    } catch { Alert.alert("Error", "No se pudo eliminar la categoría.") }
    finally { setSubmitting(false) }
  }

  const linkedFutureBySaving = (savingId: string) => futureExpenses.find((fe) => fe.saving_id === savingId) ?? null

  const openCompleteFromSaving = (saving: SavingWithRelations) => {
    const fe = linkedFutureBySaving(saving.id)
    if (!fe) return
    if (fe.status === "completed") { Alert.alert("Completado", "Este gasto futuro ya fue completado."); return }
    if (Number(saving.current_amount) < Number(fe.expected_amount)) {
      Alert.alert("Objetivo incompleto", `El objetivo aún no está completo. Llevás ${formatCurrency(Number(saving.current_amount))} de ${formatCurrency(Number(fe.expected_amount))}.`)
      return
    }
    setCompleteSavingId(saving.id); setCompletePersonId(authPerson?.id ?? ""); setCompleteModalOpen(true)
  }

  const handleCompleteFromSaving = async () => {
    if (!completeSavingId || !completePersonId) { Alert.alert("Error", "Seleccioná una persona."); return }
    setSubmitting(true)
    try {
      await completeFutureExpenseBySaving(completeSavingId, completePersonId)
      setCompleteModalOpen(false); setCompleteSavingId(null); setCompletePersonId(""); load()
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo completar el objetivo.")
    } finally { setSubmitting(false) }
  }

  const openMovement = (savingId: string, type: "income" | "withdrawal") => {
    setMovementSavingId(savingId); setMovType(type); setMovAmount(""); setMovNotes(""); setMovementModalOpen(true)
  }

  const handleMovementSubmit = async () => {
    if (!movAmount || !movementSavingId) { Alert.alert("Error", "Completá el monto."); return }
    setSubmitting(true)
    try {
      const saving = savings.find((s) => s.id === movementSavingId)
      if (!saving) { Alert.alert("Error", "No se encontró la meta."); return }
      const amountNum = parseFloat(movAmount)
      const newCurrent = movType === "income"
        ? Number(saving.current_amount) + amountNum
        : Math.max(0, Number(saving.current_amount) - amountNum)

      await Promise.all([
        createSavingMovement({
          saving_id: movementSavingId,
          type: movType,
          amount: amountNum,
          notes: movNotes.trim() || null,
          movement_date: new Date().toISOString().split("T")[0],
        }),
        updateSaving(movementSavingId, { current_amount: newCurrent }),
      ])
      setMovementModalOpen(false); load()
    } catch { Alert.alert("Error", "No se pudo registrar.") }
    finally { setSubmitting(false) }
  }

  const filtered = savings.filter((s) => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string | null; name: string; items: SavingWithRelations[] }>()
    for (const c of categories) {
      map.set(c.id, { id: c.id, name: c.name, items: [] })
    }
    for (const s of filtered) {
      const catId = s.category_id ?? "__none__"
      const catName = s.saving_categories?.name || "Sin categoría"
      if (!map.has(catId)) map.set(catId, { id: s.category_id ?? null, name: catName, items: [] })
      map.get(catId)!.items.push(s)
    }
    return map
  }, [filtered, categories])

  const totalAhorrado = savings.reduce((s: number, sv: SavingWithRelations) => s + Number(sv.current_amount), 0)
  const allExpanded = [...grouped.keys()].length > 0 && [...grouped.keys()].every((k) => expandedCats.has(k))
  const hasItems = savings.length > 0 || categories.length > 0

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }

  const renderSavingCard = (s: SavingWithRelations) => {
    const progress = Number(s.target_amount) > 0 ? Math.min(100, (Number(s.current_amount) / Number(s.target_amount)) * 100) : 0
    const linkedFuture = linkedFutureBySaving(s.id)
    const isFutureExpense = Boolean(linkedFuture)
    const isCompleted = linkedFuture?.status === "completed"
    const canComplete = isFutureExpense && !isCompleted && Number(s.current_amount) >= Number(linkedFuture?.expected_amount ?? 0)
    return (
      <View key={s.id} className="flex-row items-center px-4 py-2.5 border-b border-slate-100 last:border-b-0">
        <View className="size-7 rounded-full bg-amber-100 items-center justify-center">
          <PiggyBank size={13} color="#d97706" />
        </View>
        <View className="flex-1 ml-2.5 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-medium text-slate-900 truncate">{s.name}</Text>
            {isFutureExpense ? (
              isCompleted ? (
                <View className="flex-row items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5">
                  <CheckCircle2 size={9} color="#059669" />
                  <Text className="text-[9px] font-medium text-emerald-700">Completado</Text>
                </View>
              ) : (
                <View className="rounded-full bg-indigo-100 px-1.5 py-0.5">
                  <Text className="text-[9px] font-medium text-indigo-700">Gasto futuro</Text>
                </View>
              )
            ) : null}
          </View>
          {s.description && !isFutureExpense ? <Text className="text-[10px] text-slate-400 mt-0.5">{s.description}</Text> : null}
          {isFutureExpense && linkedFuture ? (
            <Text className="text-[10px] text-slate-500 mt-0.5">Meta {formatCurrency(Number(linkedFuture.expected_amount))} · {formatCurrency(Number(s.current_amount))} abonados</Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1.5 shrink-0 ml-3">
          {canComplete ? (
            <TouchableOpacity onPress={() => openCompleteFromSaving(s)} className="p-1.5"><CheckCircle2 size={14} color="#059669" /></TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => openMovement(s.id, "income")} className="p-1.5"><ArrowDownCircle size={14} color="#059669" /></TouchableOpacity>
          <TouchableOpacity onPress={() => openMovement(s.id, "withdrawal")} className="p-1.5"><ArrowUpCircle size={14} color="#d97706" /></TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit(s)} className="p-1.5"><Pencil size={12} color="#64748b" /></TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(s.id)} className="p-1.5"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
        </View>
        <View className="w-28 ml-2 flex-col items-end">
          <Text className="text-xs font-semibold text-emerald-600 tabular-nums">{formatCurrency(Number(s.current_amount))}</Text>
          {!isFutureExpense && (
            <>
              <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
              </View>
              <Text className="text-[9px] text-slate-400 mt-0.5">Meta: {formatCurrency(Number(s.target_amount))}</Text>
            </>
          )}
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text className="text-lg font-bold text-slate-800">Hucha</Text>
        <TouchableOpacity onPress={openNew} className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center gap-1.5">
          <Plus size={14} color="white" /><Text className="text-xs font-semibold text-white">Nueva meta</Text>
        </TouchableOpacity>
      </View>

      {categories.length === 0 ? (
        <TouchableOpacity onPress={openCatManager} className="mx-4 mb-3 flex-row items-center gap-1.5">
          <List size={12} color="#4f46e5" /><Text className="text-xs font-medium text-indigo-600">Nueva categoría</Text>
        </TouchableOpacity>
      ) : null}

      <View className="mx-4 mb-3">
        <View className="flex-row items-center bg-white rounded-xl border border-slate-200 px-3 h-9">
          <Search size={14} color="#94a3b8" />
          <TextInput className="flex-1 ml-2 text-xs text-slate-800" placeholder="Buscar hucha..." placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch("")}><X size={14} color="#94a3b8" /></TouchableOpacity> : null}
        </View>
      </View>

      <View className="flex-row gap-2 mx-4 mb-3">
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-emerald-500 mb-0.5">Total ahorrado</Text>
          <Text className="text-sm font-bold text-emerald-600">{formatCurrency(totalAhorrado)}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Huchas</Text>
          <Text className="text-sm font-bold text-slate-800">{savings.length}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Movimientos</Text>
          <Text className="text-sm font-bold text-slate-800">{movementsCount}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}>
        {!hasItems ? (
          <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
            <PiggyBank size={32} color="#cbd5e1" />
            <Text className="text-xs text-slate-400 mt-2">{search ? "Sin resultados para esa búsqueda" : "No hay huchas aún"}</Text>
          </View>
        ) : (
          <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Huchas por categoría</Text>
              <View className="flex-row items-center gap-3">
                {grouped.size > 0 && (
                  <TouchableOpacity onPress={() => { if (allExpanded) setExpandedCats(new Set()); else setExpandedCats(new Set(grouped.keys())) }}>
                    <Text className="text-[10px] text-slate-400 underline">{allExpanded ? "Contraer todo" : "Expandir todo"}</Text>
                  </TouchableOpacity>
                )}
                <Text className="text-xs font-bold text-emerald-600 tabular-nums">{formatCurrency(totalAhorrado)}</Text>
              </View>
            </View>

            {Array.from(grouped.entries()).map(([key, group]) => {
              const isExpanded = expandedCats.has(key)
              const catTotal = group.items.reduce((s: number, sv: SavingWithRelations) => s + Number(sv.current_amount), 0)
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
                  {isExpanded && group.items.map(renderSavingCard)}
                </View>
              )
            })}

            <View className="bg-white px-4 py-2.5 border-t border-slate-200 items-end">
              <TouchableOpacity onPress={openNew} className="flex-row items-center gap-1">
                <Plus size={13} color="#4f46e5" /><Text className="text-xs text-indigo-600 font-medium">Nueva hucha</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      {/* Saving Modal */}
      <Modal visible={savingModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editing ? "Editar meta" : "Nueva meta"}</Text>
              <TouchableOpacity onPress={() => setSavingModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView className="max-h-96">
              <View className="space-y-3">
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Nombre</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="¿Para qué es?" placeholderTextColor="#94a3b8" value={name} onChangeText={setName} />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Descripción (opcional)</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Un detalle..." placeholderTextColor="#94a3b8" value={description} onChangeText={setDescription} />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Meta</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={targetAmount} onChangeText={setTargetAmount} keyboardType="decimal-pad" />
                </View>
                <View>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs font-medium text-slate-600">Categoría</Text>
                    <TouchableOpacity onPress={openCatManager}>
                      <Plus size={12} color="#4f46e5" /><Text className="text-[10px] text-indigo-600 font-medium ml-0.5">Nueva categoría</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row flex-wrap gap-1.5">
                    <TouchableOpacity onPress={() => setSavingCategoryId("")}
                      className={`px-3 py-1.5 rounded-xl border ${!savingCategoryId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                      <Text className={`text-xs ${!savingCategoryId ? "text-white" : "text-slate-400"}`}>Sin categoría</Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                      <TouchableOpacity key={cat.id} onPress={() => setSavingCategoryId(cat.id)}
                        className={`px-3 py-1.5 rounded-xl border ${savingCategoryId === cat.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                        <Text className={`text-xs ${savingCategoryId === cat.id ? "text-white" : "text-slate-600"}`}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity onPress={handleSavingSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">{editing ? "Guardar cambios" : "Crear meta"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category Manager Modal */}
      <Modal visible={catManagerOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editingCat ? "Editar categoría" : "Nueva categoría"}</Text>
              <TouchableOpacity onPress={() => { setCatManagerOpen(false); setCatManagerName(""); setEditingCat(null) }}>
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
              {catDeleteSavings.length > 0 && (
                <Text className="text-[10px] text-rose-500 mt-1">Las huchas asociadas también serán eliminadas.</Text>
              )}
            </View>
            {catDeleteSavings.length > 0 && (
              <ScrollView className="max-h-40 mb-4">
                {catDeleteSavings.map((sv) => (
                  <View key={sv.id} className="flex-row items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-rose-100 mb-1">
                    <Text className="text-xs text-slate-700 flex-1 mr-2" numberOfLines={1}>{sv.name}</Text>
                    <Text className="text-xs font-semibold text-rose-600 tabular-nums">{formatCurrency(Number(sv.current_amount))}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setCatDeleteTarget(null)} className="flex-1 h-10 rounded-xl border border-slate-200 items-center justify-center">
                <Text className="text-xs font-semibold text-slate-600">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteCat} disabled={submitting} className="flex-1 h-10 rounded-xl bg-rose-600 items-center justify-center">
                {submitting ? <ActivityIndicator color="white" /> : <Text className="text-xs font-semibold text-white">{catDeleteSavings.length > 0 ? `Eliminar (${catDeleteSavings.length} huchas)` : "Eliminar"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Movement Modal */}
      <Modal visible={movementModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{movType === "income" ? "Aportar" : "Retirar"} fondos</Text>
              <TouchableOpacity onPress={() => setMovementModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View className="flex-row gap-2 mb-4">
              <TouchableOpacity onPress={() => setMovType("income")}
                className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5 border ${movType === "income" ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-200"}`}>
                <ArrowDownCircle size={14} color={movType === "income" ? "white" : "#059669"} />
                <Text className={`text-xs font-medium ${movType === "income" ? "text-white" : "text-slate-600"}`}>Ingreso</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMovType("withdrawal")}
                className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5 border ${movType === "withdrawal" ? "bg-amber-600 border-amber-600" : "bg-white border-slate-200"}`}>
                <ArrowUpCircle size={14} color={movType === "withdrawal" ? "white" : "#d97706"} />
                <Text className={`text-xs font-medium ${movType === "withdrawal" ? "text-white" : "text-slate-600"}`}>Retiro</Text>
              </TouchableOpacity>
            </View>
            <View className="space-y-3">
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Monto</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={movAmount} onChangeText={setMovAmount} keyboardType="decimal-pad" />
              </View>
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Nota (opcional)</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="¿Algo que recordar?" placeholderTextColor="#94a3b8" value={movNotes} onChangeText={setMovNotes} />
              </View>
            </View>
            <TouchableOpacity onPress={handleMovementSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">{movType === "income" ? "Aportar" : "Retirar"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Complete from hucha Modal */}
      <Modal visible={completeModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <Text className="text-sm font-semibold text-slate-800 mb-1">Completar objetivo</Text>
            <Text className="text-[11px] text-slate-500 mb-4">El dinero saldrá de esta hucha hacia el disponible.</Text>
            <Text className="text-xs font-medium text-slate-600 mb-1">Persona (ingreso al disponible)</Text>
            <View className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              {people.length === 0 ? (
                <Text className="text-xs text-slate-400 px-3 py-3">Sin personas registradas.</Text>
              ) : (
                people.map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => setCompletePersonId(p.id)} className={`px-3 py-2.5 flex-row items-center justify-between ${completePersonId === p.id ? "bg-emerald-50" : ""}`}>
                    <Text className={`text-sm ${completePersonId === p.id ? "text-emerald-700 font-semibold" : "text-slate-700"}`}>{p.name}</Text>
                    {completePersonId === p.id ? <CheckCircle2 size={16} color="#059669" /> : null}
                  </TouchableOpacity>
                ))
              )}
            </View>
            <TouchableOpacity onPress={handleCompleteFromSaving} disabled={submitting || !completePersonId} className={`h-11 rounded-xl items-center justify-center ${submitting || !completePersonId ? "bg-slate-200" : "bg-emerald-600"}`}>
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">Completar</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}