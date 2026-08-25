import { useEffect, useState, useCallback, useMemo } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getExpenses, getPeople, getExpenseCategories, getBudgetCategoriesForMonth, createExpense, updateExpense, deleteExpense, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory, getSavings, type ExpenseWithRelations, type BudgetCategoryWithTemplate } from "@/services/api"
import { formatCurrency, toLocalDateString, todayString } from "@/utils/format"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { useMonthFilter } from "@/hooks/useMonthFilter"
import DateFilter from "@/components/DateFilter"
import DatePickerModal from "@/components/DatePickerModal"
import { Plus, Trash2, Pencil, Search, X, Calendar, ChevronDown, ChevronRight, ArrowUpCircle, TrendingUp, List } from "lucide-react-native"
import type { Person, ExpenseCategory, ExpenseCategoryTab, Saving } from "@/types/database"

export default function GastosScreen() {
  const insets = useSafeAreaInsets()
  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategoryWithTemplate[]>([])
  const [savings, setSavings] = useState<Saving[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseWithRelations | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<ExpenseCategoryTab>("categoria")
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const { months, setMonths } = useMonthFilter()
  const sorted = [...months].sort()
  const activeMonth = sorted[0] ?? ""

  const [personId, setPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(todayString())
  const [categoryId, setCategoryId] = useState("")
  const [budgetCategoryId, setBudgetCategoryId] = useState("")
  const [assumeAvailable, setAssumeAvailable] = useState(false)
  const [savingId, setSavingId] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const parsedDate = useMemo(() => new Date(date + "T12:00:00"), [date])

  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const [catManagerName, setCatManagerName] = useState("")
  const [catManagerTab, setCatManagerTab] = useState<ExpenseCategoryTab>("categoria")
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null)
  const [catDeleteTarget, setCatDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [catDeleteExpenses, setCatDeleteExpenses] = useState<ExpenseWithRelations[]>([])

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const startDate = sorted.length > 0 ? `${sorted[0]}-01` : undefined
      const endDate = sorted.length > 0 ? (() => {
        const [y, m] = sorted[sorted.length - 1].split("-").map(Number)
        return `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate().toString().padStart(2, "0")}`
      })() : undefined
      const [exp, p, cats, bCats, sav] = await Promise.all([
        getExpenses({ startDate, endDate }),
        getPeople(),
        getExpenseCategories(),
        activeMonth ? getBudgetCategoriesForMonth(activeMonth) : Promise.resolve([]),
        getSavings(),
      ])
      setExpenses(exp)
      setPeople(p)
      setCategories(cats)
      setBudgetCategories(bCats)
      setSavings(sav)
    } catch (error) {
      console.error("[KellyCash][Mobile][Gastos] load failed", error)
      setLoadError("No se pudieron cargar los gastos. Revisa la sesión y la configuración de Supabase.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [sorted, activeMonth])

  useEffect(() => {
    void (async () => { await load() })()
  }, [load])

  useRealtimeSubscription("expenses", () => load(), () => load(), () => load())

  const openNew = () => {
    setEditing(null)
    setPersonId("")
    setAmount("")
    setDescription("")
    setDate(todayString())
    setCategoryId("")
    setBudgetCategoryId("")
    setAssumeAvailable(false)
    setSavingId("")
    setModalOpen(true)
  }

  const openEdit = (exp: ExpenseWithRelations) => {
    setEditing(exp)
    setPersonId(exp.person_id)
    setAmount(String(exp.amount))
    setDescription(exp.description)
    setDate(exp.date)
    setCategoryId(exp.expense_category_id ?? "")
    setBudgetCategoryId(exp.budget_category_id ?? "")
    setAssumeAvailable(!exp.budget_category_id && !exp.saving_id)
    setSavingId(exp.saving_id ?? "")
    setModalOpen(true)
  }

  const openCatManager = (selectAfter = false, tab: ExpenseCategoryTab = "categoria") => {
    setEditingCat(null)
    setCatManagerName("")
    setCatManagerTab(tab)
    setCatSelectionPending(selectAfter)
    setCatManagerOpen(true)
  }

  const [catSelectionPending, setCatSelectionPending] = useState(false)

  const handleSubmit = async () => {
    if (!personId || !amount) {
      Alert.alert("Error", "Completá persona y monto.")
      return
    }
    if (!budgetCategoryId && !assumeAvailable && !savingId) {
      Alert.alert("Error", "El gasto debe tener un rubro, asumir el disponible o estar vinculado a una hucha.")
      return
    }
    setSubmitting(true)
    try {
      const data = {
        person_id: personId,
        amount: parseFloat(amount),
        description,
        date,
        expense_category_id: categoryId || null,
        budget_category_id: budgetCategoryId || null,
        saving_id: savingId || null,
      }
      if (editing) {
        await updateExpense(editing.id, data)
      } else {
        await createExpense(data)
      }
      setModalOpen(false)
      load()
    } catch {
      Alert.alert("Error", "No se pudo guardar el gasto.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (id: string) => {
    const exp = expenses.find((e) => e.id === id)
    const msg = exp?.saving_id
      ? "¿Eliminar el gasto? También se eliminará el movimiento de hucha asociado."
      : "¿Estás segura?"
    Alert.alert("Eliminar gasto", msg, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        try { await deleteExpense(id); load() } catch { Alert.alert("Error", "No se pudo eliminar.") }
      }},
    ])
  }

  const handleCatSubmit = async () => {
    if (!catManagerName.trim()) return
    setSubmitting(true)
    try {
      if (editingCat) {
        await updateExpenseCategory(editingCat.id, { name: catManagerName.trim(), tab: catManagerTab })
      } else {
        const { data: created } = await createExpenseCategory({ name: catManagerName.trim(), tab: catManagerTab })
        if (created && catSelectionPending) setCategoryId(created.id)
      }
      setCatManagerOpen(false)
      setCatSelectionPending(false)
      const cats = await getExpenseCategories()
      setCategories(cats)
    } catch { Alert.alert("Error", "No se pudo guardar la categoría.") }
    finally { setSubmitting(false) }
  }

  const handleDeleteCat = (id: string, name: string) => {
    const related = expenses.filter((e) => e.expense_category_id === id)
    setCatDeleteExpenses(related)
    setCatDeleteTarget({ id, name })
  }

  const confirmDeleteCat = async () => {
    if (!catDeleteTarget) return
    setSubmitting(true)
    try {
      for (const exp of catDeleteExpenses) await deleteExpense(exp.id)
      await deleteExpenseCategory(catDeleteTarget.id)
      setCatDeleteTarget(null)
      setCatDeleteExpenses([])
      const cats = await getExpenseCategories()
      setCategories(cats)
      if (categoryId === catDeleteTarget.id) setCategoryId("")
      load()
    } catch { Alert.alert("Error", "No se pudo eliminar.") }
    finally { setSubmitting(false) }
  }

  const filtered = expenses.filter((e) => {
    if (search) {
      const q = search.toLowerCase()
      if (!(e.description?.toLowerCase().includes(q) || e.people?.name?.toLowerCase().includes(q) || e.expense_categories?.name?.toLowerCase().includes(q))) return false
    }
    return true
  })

  const itemsByTab = useCallback((tab: ExpenseCategoryTab) => {
    if (tab === "categoria") return filtered.filter((e) => !!e.budget_category_id)
    if (tab === "disponible") return filtered.filter((e) => !e.budget_category_id && !e.saving_id)
    return filtered.filter((e) => !!e.saving_id)
  }, [filtered])

  const buildGrouped = useCallback((tab: ExpenseCategoryTab, items: ExpenseWithRelations[]) => {
    const map = new Map<string, { id: string | null; name: string; items: ExpenseWithRelations[] }>()
    for (const c of categories) {
      const cTab = c.tab ?? "categoria"
      if (cTab !== tab) continue
      map.set(c.id, { id: c.id, name: c.name, items: [] })
    }
    for (const e of items) {
      const cat = categories.find((c) => c.id === e.expense_category_id)
      if (cat && (cat.tab ?? "categoria") !== tab) continue
      const catId = e.expense_category_id ?? "__none__"
      const catName = e.expense_categories?.name || "Sin categoría"
      if (!map.has(catId)) map.set(catId, { id: e.expense_category_id ?? null, name: catName, items: [] })
      map.get(catId)!.items.push(e)
    }
    return map
  }, [categories])

  const grouped = useMemo(() => buildGrouped(view, itemsByTab(view)), [view, buildGrouped, itemsByTab])
  const viewItems = itemsByTab(view)
  const total = expenses.reduce((s: number, e: ExpenseWithRelations) => s + Number(e.amount), 0)
  const masAlto = expenses.reduce((max: ExpenseWithRelations | null, e: ExpenseWithRelations) => Number(e.amount) > Number(max?.amount ?? 0) ? e : max, expenses[0] ?? null)
  const sinCategoria = expenses.filter((e) => !e.expense_category_id).length
  const allExpanded = [...grouped.keys()].length > 0 && [...grouped.keys()].every((k) => expandedCats.has(k))
  const formTab: ExpenseCategoryTab = savingId ? "hucha" : assumeAvailable ? "disponible" : "categoria"
  const formCategories = categories.filter((c) => (c.tab ?? "categoria") === formTab)
  const budgetGroups = useMemo(() => {
    const m = new Map<string, BudgetCategoryWithTemplate[]>()
    for (const bc of budgetCategories) {
      const tpl = bc.budget_templates?.name ?? "Sin plantilla"
      if (!m.has(tpl)) m.set(tpl, [])
      m.get(tpl)!.push(bc)
    }
    return Array.from(m.entries())
  }, [budgetCategories])

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }

  const renderRow = (exp: ExpenseWithRelations) => (
    <View key={exp.id} className="flex-row items-center px-4 py-2 border-b border-slate-100 last:border-b-0">
      <View className="flex-1 flex-row items-center min-w-0">
        <View className="size-7 rounded-full bg-rose-100 items-center justify-center">
          <TrendingUp size={13} color="#e11d48" />
        </View>
        <View className="ml-2.5 flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-medium text-slate-900 truncate">{exp.description || "Sin concepto"}</Text>
            <Text className="text-[10px] text-slate-400 shrink-0">{new Date(exp.date + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</Text>
          </View>
          {exp.people?.name && <Text className="text-[10px] text-slate-500">{exp.people.name}</Text>}
        </View>
      </View>
      <View className="flex-row items-center gap-3 shrink-0 ml-3">
        {exp.savings?.name && <Text className="text-[10px] text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">{exp.savings.name}</Text>}
        <Text className="text-xs font-semibold text-rose-600 tabular-nums">- {formatCurrency(Number(exp.amount))}</Text>
        <TouchableOpacity onPress={() => openEdit(exp)} className="p-0.5"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(exp.id)} className="p-0.5"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Text className="text-lg font-bold text-slate-800">Gastos</Text>
        <TouchableOpacity onPress={openNew} className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center gap-1.5">
          <Plus size={14} color="white" />
          <Text className="text-xs font-semibold text-white">Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mb-3">
        <DateFilter months={months} onChange={setMonths} />
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
            placeholder="Buscar gasto..."
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

      <View className="flex-row gap-2 mx-4 mb-3">
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-rose-500 mb-0.5">Total gastado</Text>
          <Text className="text-sm font-bold text-rose-600">{formatCurrency(total)}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Gasto récord</Text>
          <Text className="text-sm font-bold text-rose-600" numberOfLines={1}>{masAlto ? formatCurrency(Number(masAlto.amount)) : "-"}</Text>
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

      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}
      >
        <View className="flex-row gap-1 mb-3 border-b border-slate-200">
          {([["categoria", "Categoría"], ["disponible", "Disponible"], ["hucha", "Hucha"]] as [ExpenseCategoryTab, string][]).map(([key, label]) => (
            <TouchableOpacity key={key} onPress={() => setView(key)} className={`flex-row items-center gap-1.5 px-3 py-2 border-b-2 ${view === key ? "border-indigo-600" : "border-transparent"}`}>
              {key === "categoria" ? <List size={14} color={view === key ? "#4f46e5" : "#64748b"} /> : key === "disponible" ? <ArrowUpCircle size={14} color={view === key ? "#4f46e5" : "#64748b"} /> : <TrendingUp size={14} color={view === key ? "#4f46e5" : "#64748b"} />}
              <Text className={`text-xs font-medium ${view === key ? "text-indigo-600" : "text-slate-500"}`}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <View className="flex-row items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{view === "categoria" ? "Gastos por categoría" : view === "disponible" ? "Disponible para gastar" : "Gastos por hucha"}</Text>
            <View className="flex-row items-center gap-3">
              {grouped.size > 0 && (
                <TouchableOpacity onPress={() => { if (allExpanded) setExpandedCats(new Set()); else setExpandedCats(new Set(grouped.keys())) }}>
                  <Text className="text-[10px] text-slate-400 underline">{allExpanded ? "Contraer todo" : "Expandir todo"}</Text>
                </TouchableOpacity>
              )}
              <Text className="text-xs font-bold text-rose-600 tabular-nums">{formatCurrency(viewItems.reduce((s: number, e: ExpenseWithRelations) => s + Number(e.amount), 0))}</Text>
            </View>
          </View>

          {grouped.size === 0 ? (
            <View className="px-4 py-8 items-center">
              <Text className="text-xs text-slate-500">{view === "categoria" ? "No hay gastos con rubro." : view === "disponible" ? "No hay gastos asumidos del disponible." : "No hay gastos vinculados a una hucha."}</Text>
            </View>
          ) : (
            Array.from(grouped.entries()).map(([key, group]) => {
              const isExpanded = expandedCats.has(key)
              const catTotal = group.items.reduce((s: number, e: ExpenseWithRelations) => s + Number(e.amount), 0)
              const cat = categories.find((c) => c.id === group.id)
              return (
                <View key={key}>
                  <View className="flex-row items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <TouchableOpacity onPress={() => setExpandedCats((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })} className="mr-2">
                      {isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                    </TouchableOpacity>
                    {cat && (
                      <>
                        <TouchableOpacity onPress={() => { setEditingCat(cat); setCatManagerName(cat.name); setCatManagerTab(cat.tab ?? "categoria"); setCatManagerOpen(true) }} className="p-0.5 mr-0.5">
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
            })
          )}

          <View className="bg-white px-4 py-2.5 border-t border-slate-200 items-end">
            <TouchableOpacity onPress={openNew} className="flex-row items-center gap-1">
              <Plus size={13} color="#4f46e5" /><Text className="text-xs text-indigo-600 font-medium">Nuevo gasto</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="h-8" />
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editing ? "Editar gasto" : "Nuevo gasto"}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-[70%]" keyboardShouldPersistTaps="handled">
              <View className="space-y-3">
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Persona</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
                    {people.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setPersonId(p.id)}
                        className={`px-3 py-1.5 rounded-xl border ${personId === p.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                      >
                        <Text className={`text-xs ${personId === p.id ? "text-white" : "text-slate-600"}`}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Monto</Text>
                  <TextInput
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
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
                  <TextInput
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800"
                    placeholder="¿En qué gastaste?"
                    placeholderTextColor="#94a3b8"
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>

                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Rubro</Text>
                  <TouchableOpacity
                    onPress={() => { setBudgetCategoryId(""); setAssumeAvailable(false); setSavingId("") }}
                    className={`px-3 py-1.5 rounded-xl border mb-1.5 self-start ${!budgetCategoryId && !assumeAvailable && !savingId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                  >
                    <Text className={`text-xs ${!budgetCategoryId && !assumeAvailable && !savingId ? "text-white" : "text-slate-400"}`}>Sin rubro</Text>
                  </TouchableOpacity>
                  {budgetCategories.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5 pb-1">
                      {budgetGroups.map(([tpl, cats]) => (
                        <View key={tpl} className="mr-2">
                          <Text className="text-[9px] font-semibold text-slate-400 uppercase mb-1">{tpl}</Text>
                          <View className="flex-row flex-wrap gap-1.5">
                            {cats.map((bc) => (
                              <TouchableOpacity
                                key={bc.id}
                                onPress={() => { setBudgetCategoryId(bc.id); setAssumeAvailable(false); setSavingId("") }}
                                className={`px-3 py-1.5 rounded-xl border ${budgetCategoryId === bc.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                              >
                                <Text className={`text-xs ${budgetCategoryId === bc.id ? "text-white" : "text-slate-600"}`}>{bc.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text className="text-[10px] text-slate-400">No hay rubros para el mes seleccionado.</Text>
                  )}
                </View>

                <View>
                  <TouchableOpacity
                    onPress={() => { setAssumeAvailable(!assumeAvailable); if (!assumeAvailable) { setBudgetCategoryId(""); setSavingId("") } }}
                    className="flex-row items-center gap-2"
                  >
                    <View className={`size-4 rounded border ${assumeAvailable ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"}`}>
                      {assumeAvailable && <Text className="text-white text-[10px] text-center">✓</Text>}
                    </View>
                    <Text className="text-xs text-slate-600">Asumir del disponible para gastar</Text>
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Hucha</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
                    <TouchableOpacity
                      onPress={() => { setSavingId(""); if (!assumeAvailable) setBudgetCategoryId("") }}
                      className={`px-3 py-1.5 rounded-xl border ${!savingId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                    >
                      <Text className={`text-xs ${!savingId ? "text-white" : "text-slate-400"}`}>Sin hucha</Text>
                    </TouchableOpacity>
                    {savings.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => { setSavingId(s.id); setBudgetCategoryId(""); setAssumeAvailable(false) }}
                        className={`px-3 py-1.5 rounded-xl border ${savingId === s.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                      >
                        <Text className={`text-xs ${savingId === s.id ? "text-white" : "text-slate-600"}`}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs font-medium text-slate-600">Categoría de gastos</Text>
                    <TouchableOpacity onPress={() => openCatManager(true, formTab)}>
                      <Text className="text-[10px] text-indigo-600 font-medium">Nueva categoría</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
                    <TouchableOpacity
                      onPress={() => setCategoryId("")}
                      className={`px-3 py-1.5 rounded-xl border ${!categoryId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                    >
                      <Text className={`text-xs ${!categoryId ? "text-white" : "text-slate-400"}`}>Sin categoría</Text>
                    </TouchableOpacity>
                    {formCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setCategoryId(cat.id)}
                        className={`px-3 py-1.5 rounded-xl border ${categoryId === cat.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                      >
                        <Text className={`text-xs ${categoryId === cat.id ? "text-white" : "text-slate-600"}`}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4"
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-sm font-semibold text-white">{editing ? "Guardar cambios" : "Crear gasto"}</Text>
              )}
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
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Pertenece a</Text>
                <View className="flex-row gap-1.5">
                  {([["categoria", "Categoría"], ["disponible", "Disponible"], ["hucha", "Hucha"]] as [ExpenseCategoryTab, string][]).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setCatManagerTab(key)}
                      className={`px-3 py-1.5 rounded-xl border ${catManagerTab === key ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                    >
                      <Text className={`text-xs ${catManagerTab === key ? "text-white" : "text-slate-600"}`}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
              {catDeleteExpenses.length > 0 && (
                <Text className="text-[10px] text-rose-500 mt-1">{catDeleteExpenses.length} gasto{catDeleteExpenses.length !== 1 ? "s" : ""} asociado{catDeleteExpenses.length !== 1 ? "s" : ""} también será{catDeleteExpenses.length !== 1 ? "n" : ""} eliminado{catDeleteExpenses.length !== 1 ? "s" : ""}.</Text>
              )}
            </View>
            {catDeleteExpenses.length > 0 && (
              <ScrollView className="max-h-40 mb-4">
                {catDeleteExpenses.map((exp) => (
                  <View key={exp.id} className="flex-row items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-rose-100 mb-1">
                    <Text className="text-xs text-slate-700 flex-1 mr-2" numberOfLines={1}>{exp.description || "Sin concepto"}</Text>
                    <Text className="text-xs font-semibold text-rose-600 tabular-nums">{formatCurrency(Number(exp.amount))}</Text>
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
    </View>
  )
}