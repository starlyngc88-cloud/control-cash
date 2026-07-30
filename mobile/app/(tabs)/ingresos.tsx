import { useEffect, useState, useCallback, useMemo } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getIncomes, getPeople, getIncomeCategories, createIncome, updateIncome, deleteIncome, createIncomeCategory, deleteIncomeCategory } from "@/services/api"
import { formatCurrency } from "@/utils/format"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { useMonthFilter } from "@/hooks/useMonthFilter"
import DateFilter from "@/components/DateFilter"
import DatePickerModal from "@/components/DatePickerModal"
import { Plus, TrendingDown, Pencil, Trash2, Search, X, Calendar } from "lucide-react-native"

export default function IngresosScreen() {
  const insets = useSafeAreaInsets()
  const [incomes, setIncomes] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const [newCatName, setNewCatName] = useState("")

  const { months, setMonths } = useMonthFilter()

  const [personId, setPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [categoryId, setCategoryId] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const parsedDate = useMemo(() => new Date(date + "T12:00:00"), [date])

  const load = useCallback(async () => {
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
    setLoading(false)
    setRefreshing(false)
  }, [months])

  useEffect(() => { load() }, [load])
  useRealtimeSubscription("incomes", () => load(), () => load(), () => load())

  const openNew = () => {
    setEditing(null)
    setPersonId(""); setAmount(""); setDescription(""); setDate(new Date().toISOString().split("T")[0]); setCategoryId("")
    setModalOpen(true)
  }

  const openEdit = (inc: any) => {
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

  const filtered = incomes.filter((i) => !search || i.description?.toLowerCase().includes(search.toLowerCase()))

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }

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
        <View className="flex-row items-center bg-white rounded-xl border border-slate-200 px-3 h-9">
          <Search size={14} color="#94a3b8" />
          <TextInput className="flex-1 ml-2 text-xs text-slate-800" placeholder="Buscar ingreso..." placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch("")}><X size={14} color="#94a3b8" /></TouchableOpacity> : null}
        </View>
      </View>

      <View className="flex-row gap-3 mx-4 mb-3">
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-emerald-500 mb-0.5">Total ingresado</Text>
          <Text className="text-sm font-bold text-emerald-600">{formatCurrency(incomes.reduce((s: number, i: any) => s + Number(i.amount), 0))}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Registros</Text>
          <Text className="text-sm font-bold text-slate-800">{incomes.length}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Categorías</Text>
          <Text className="text-sm font-bold text-slate-800">{new Set(incomes.filter(i => i.category_id).map(i => i.category_id)).size}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}>
        {filtered.length === 0 ? (
          <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
            <Text className="text-xs text-slate-400">Sin ingresos {search ? "para esa búsqueda" : "aún"}</Text>
          </View>
        ) : (
          <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {filtered.map((inc) => (
              <View key={inc.id} className="flex-row items-center px-4 py-3 border-b border-slate-100 last:border-b-0">
                <View className="size-8 rounded-full bg-emerald-100 items-center justify-center">
                  <TrendingDown size={14} color="#059669" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-xs font-medium text-slate-900" numberOfLines={1}>{inc.description || "Sin concepto"}</Text>
                  <Text className="text-[10px] text-slate-400">{inc.people?.name}{inc.people?.name ? " · " : ""}{new Date(inc.date).toLocaleDateString("es-CO")}</Text>
                </View>
                <Text className="text-xs font-semibold text-emerald-600 mr-2">{formatCurrency(Number(inc.amount))}</Text>
                <TouchableOpacity onPress={() => openEdit(inc)} className="p-1.5"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(inc.id)} className="p-1.5"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      {filtered.length > 0 && (
        <View className="flex-row items-center justify-between px-4 py-2.5 bg-white border-t border-slate-200" style={{ paddingBottom: insets.bottom + 8 }}>
          <Text className="text-xs font-medium text-slate-500">Total ({filtered.length} registros)</Text>
          <Text className="text-sm font-bold text-emerald-600">{formatCurrency(filtered.reduce((s: number, i: any) => s + Number(i.amount), 0))}</Text>
        </View>
      )}

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
                    onChange={(d) => setDate(d.toISOString().split("T")[0])}
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
                    <TouchableOpacity onPress={() => setCatManagerOpen(true)}>
                      <Text className="text-[10px] font-medium text-indigo-600">Gestionar categorías</Text>
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
        <View className="flex-1 justify-end bg-black/30">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ maxHeight: "70%", paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">Gestionar categorías</Text>
              <TouchableOpacity onPress={() => setCatManagerOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView className="max-h-60 mb-4">
              {categories.length === 0 ? (
                <Text className="text-xs text-slate-400 text-center py-4">Sin categorías aún</Text>
              ) : (
                categories.map((cat) => (
                  <View key={cat.id} className="flex-row items-center justify-between py-2.5 border-b border-slate-100">
                    <Text className="text-xs text-slate-800">{cat.name}</Text>
                    <TouchableOpacity onPress={async () => {
                      await deleteIncomeCategory(cat.id)
                      const updated = await getIncomeCategories()
                      setCategories(updated)
                    }}>
                      <Trash2 size={14} color="#e11d48" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            <View className="flex-row items-center gap-2">
              <TextInput
                className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800"
                placeholder="Nueva categoría..."
                placeholderTextColor="#94a3b8"
                value={newCatName}
                onChangeText={setNewCatName}
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!newCatName.trim()) return
                  await createIncomeCategory({ name: newCatName.trim() })
                  setNewCatName("")
                  const updated = await getIncomeCategories()
                  setCategories(updated)
                }}
                className="h-10 px-4 rounded-xl bg-indigo-600 items-center justify-center"
              >
                <Text className="text-xs font-semibold text-white">Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
