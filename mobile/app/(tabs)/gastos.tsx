import { useEffect, useState, useCallback, useMemo } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getExpenses, getPeople, getExpenseCategories, getBudgetCategoriesForMonth, createExpense, updateExpense, deleteExpense, createExpenseCategory, deleteExpenseCategory } from "@/services/api"
import { formatCurrency, formatDate } from "@/utils/format"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { useMonthFilter } from "@/hooks/useMonthFilter"
import DateFilter from "@/components/DateFilter"
import DatePickerModal from "@/components/DatePickerModal"
import { Plus, TrendingUp, Pencil, Trash2, Search, X, Calendar } from "lucide-react-native"

export default function GastosScreen() {
  const insets = useSafeAreaInsets()
  const [expenses, setExpenses] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [budgetCategories, setBudgetCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  const { months, setMonths } = useMonthFilter()

  // Form state
  const [personId, setPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [categoryId, setCategoryId] = useState("")
  const [budgetCategoryId, setBudgetCategoryId] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const parsedDate = useMemo(() => new Date(date + "T12:00:00"), [date])
  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const [catManagerName, setCatManagerName] = useState("")

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const sorted = [...months].sort()
      const startDate = sorted.length > 0 ? `${sorted[0]}-01` : undefined
      const endDate = sorted.length > 0 ? (() => {
        const [y, m] = sorted[sorted.length - 1].split("-").map(Number)
        return `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate().toString().padStart(2, "0")}`
      })() : undefined
      const [exp, p, cats, bCats] = await Promise.all([
        getExpenses({ startDate, endDate }),
        getPeople(),
        getExpenseCategories(),
        sorted.length > 0 ? getBudgetCategoriesForMonth(sorted[0]) : Promise.resolve([]),
      ])
      setExpenses(exp)
      setPeople(p)
      setCategories(cats)
      setBudgetCategories(bCats)
    } catch (error) {
      console.error("[KellyCash][Mobile][Gastos] load failed", error)
      setLoadError("No se pudieron cargar los gastos. Revisa la sesión y la configuración de Supabase.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [months])

  useEffect(() => { load() }, [load])

  useRealtimeSubscription("expenses", () => load(), () => load(), () => load())

  const openNew = () => {
    setEditing(null)
    setPersonId("")
    setAmount("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setCategoryId("")
    setBudgetCategoryId("")
    setModalOpen(true)
  }

  const openEdit = (exp: any) => {
    setEditing(exp)
    setPersonId(exp.person_id)
    setAmount(String(exp.amount))
    setDescription(exp.description)
    setDate(exp.date)
    setCategoryId(exp.expense_category_id ?? "")
    setBudgetCategoryId(exp.budget_category_id ?? "")
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!personId || !amount) {
      Alert.alert("Error", "Completá persona y monto.")
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
      }
      if (editing) {
        await updateExpense(editing.id, data)
      } else {
        await createExpense(data)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      Alert.alert("Error", "No se pudo guardar el gasto.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar gasto", "¿Estás segura?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        await deleteExpense(id)
        load()
      }},
    ])
  }

  const filtered = expenses.filter((e) =>
    !search || e.description?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Text className="text-lg font-bold text-slate-800">Gastos</Text>
        <TouchableOpacity onPress={openNew} className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center gap-1.5">
          <Plus size={14} color="white" />
          <Text className="text-xs font-semibold text-white">Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View className="px-4 mb-3">
        <DateFilter months={months} onChange={setMonths} />
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

      {/* KPI summary */}
      <View className="flex-row gap-2 mx-4 mb-3">
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-rose-500 mb-0.5">Total gastado</Text>
          <Text className="text-sm font-bold text-rose-600">{formatCurrency(expenses.reduce((s: number, e: any) => s + Number(e.amount), 0))}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Registros</Text>
          <Text className="text-sm font-bold text-slate-800">{expenses.length}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Categorías</Text>
          <Text className="text-sm font-bold text-slate-800">{new Set(expenses.map((e: any) => e.expense_category_id).filter(Boolean)).size}</Text>
        </View>
      </View>

      {/* List */}
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}
      >
        {filtered.length === 0 ? (
          <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
            <Text className="text-xs text-slate-400">Sin gastos {search ? "para esa búsqueda" : "aún"}</Text>
          </View>
        ) : (
          <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {filtered.map((exp) => (
              <View key={exp.id} className="flex-row items-center px-4 py-3 border-b border-slate-100 last:border-b-0">
                <View className="size-8 rounded-full bg-rose-100 items-center justify-center">
                  <TrendingUp size={14} color="#e11d48" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-xs font-medium text-slate-900" numberOfLines={1}>
                    {exp.description || "Sin concepto"}
                  </Text>
                  <Text className="text-[10px] text-slate-400">
                    {exp.people?.name}{exp.people?.name ? " · " : ""}{exp.budget_categories?.name ? `${exp.budget_categories.name} · ` : ""}{new Date(exp.date).toLocaleDateString("es-CO")}
                  </Text>
                </View>
                <Text className="text-xs font-semibold text-rose-600 mr-2">
                  {formatCurrency(Number(exp.amount))}
                </Text>
                <TouchableOpacity onPress={() => openEdit(exp)} className="p-1.5">
                  <Pencil size={12} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(exp.id)} className="p-1.5">
                  <Trash2 size={12} color="#e11d48" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      {/* Footer total */}
      <View className="px-4 py-3 border-t border-slate-200 bg-white" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-slate-600">Total</Text>
          <Text className="text-sm font-bold text-rose-600">{formatCurrency(filtered.reduce((s: number, e: any) => s + Number(e.amount), 0))}</Text>
        </View>
      </View>

      {/* Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editing ? "Editar gasto" : "Nuevo gasto"}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-96">
              <View className="space-y-3">
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Persona</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {people.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setPersonId(p.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs border ${personId === p.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                      >
                        <Text className={`text-xs ${personId === p.id ? "text-white" : "text-slate-600"}`}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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
                    onChange={(d) => setDate(d.toISOString().split("T")[0])}
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
                  <Text className="text-xs font-medium text-slate-600 mb-1">Tipo de gasto</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    <TouchableOpacity
                      onPress={() => setBudgetCategoryId("")}
                      className={`px-3 py-1.5 rounded-xl border ${!budgetCategoryId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                    >
                      <Text className={`text-xs ${!budgetCategoryId ? "text-white" : "text-slate-400"}`}>Sin rubro</Text>
                    </TouchableOpacity>
                    {budgetCategories.map((bc) => (
                      <TouchableOpacity
                        key={bc.id}
                        onPress={() => setBudgetCategoryId(bc.id)}
                        className={`px-3 py-1.5 rounded-xl border ${budgetCategoryId === bc.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                      >
                        <Text className={`text-xs ${budgetCategoryId === bc.id ? "text-white" : "text-slate-600"}`}>{bc.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs font-medium text-slate-600">Categoría</Text>
                    <TouchableOpacity onPress={() => setCatManagerOpen(true)}>
                      <Text className="text-[10px] text-indigo-600 font-medium">Gestionar categorías</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row flex-wrap gap-1.5">
                    <TouchableOpacity
                      onPress={() => setCategoryId("")}
                      className={`px-3 py-1.5 rounded-xl border ${!categoryId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                    >
                      <Text className={`text-xs ${!categoryId ? "text-white" : "text-slate-400"}`}>Sin categoría</Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setCategoryId(cat.id)}
                        className={`px-3 py-1.5 rounded-xl border ${categoryId === cat.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                      >
                        <Text className={`text-xs ${categoryId === cat.id ? "text-white" : "text-slate-600"}`}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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

      {/* Category Manager Modal */}
      <Modal visible={catManagerOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">Gestionar categorías</Text>
              <TouchableOpacity onPress={() => { setCatManagerOpen(false); setCatManagerName("") }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View className="max-h-96">
              <View className="flex-row items-center gap-2 mb-4">
                <TextInput
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800"
                  placeholder="Nueva categoría"
                  placeholderTextColor="#94a3b8"
                  value={catManagerName}
                  onChangeText={setCatManagerName}
                />
                <TouchableOpacity
                  onPress={async () => {
                    if (!catManagerName.trim()) return
                    await createExpenseCategory({ name: catManagerName.trim() })
                    setCatManagerName("")
                    const cats = await getExpenseCategories()
                    setCategories(cats)
                  }}
                  className="h-10 px-4 rounded-xl bg-indigo-600 items-center justify-center"
                >
                  <Text className="text-xs font-semibold text-white">Agregar</Text>
                </TouchableOpacity>
              </View>

              {categories.map((cat) => (
                <View key={cat.id} className="flex-row items-center justify-between py-2.5 border-b border-slate-100">
                  <Text className="text-sm text-slate-800">{cat.name}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert("Eliminar categoría", `¿Eliminar "${cat.name}"?`, [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Eliminar", style: "destructive", onPress: async () => {
                          await deleteExpenseCategory(cat.id)
                          const cats = await getExpenseCategories()
                          setCategories(cats)
                          if (categoryId === cat.id) setCategoryId("")
                        }},
                      ])
                    }}
                    className="p-1.5"
                  >
                    <Trash2 size={14} color="#e11d48" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
