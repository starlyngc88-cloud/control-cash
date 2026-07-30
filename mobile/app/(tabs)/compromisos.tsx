import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { getCommitments, createCommitment, updateCommitment, deleteCommitment, getCommitmentPayments, createCommitmentPayment, getAllBudgetCategories } from "@/services/api"
import { formatCurrency, formatDate } from "@/utils/format"
import { Plus, CircleDollarSign, Pencil, Trash2, X, ArrowDownCircle, History, Search } from "lucide-react-native"

export default function CompromisosScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [commitments, setCommitments] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [historyTitle, setHistoryTitle] = useState("")
  const [editing, setEditing] = useState<any>(null)
  const [paymentCommId, setPaymentCommId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState("")
  const [descrip, setDescrip] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [currentBalance, setCurrentBalance] = useState("")
  const [commCategoryId, setCommCategoryId] = useState("")
  const [payAmount, setPayAmount] = useState("")
  const [payCapital, setPayCapital] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])

  const load = useCallback(async () => {
    const [com, cats] = await Promise.all([getCommitments(), getAllBudgetCategories()])
    setCommitments(com)
    setCategories(cats.filter((c: any) => !c.parent_id))
    setLoading(false); setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null); setName(""); setDescrip(""); setTotalAmount(""); setCurrentBalance(""); setCommCategoryId(""); setModalOpen(true)
  }

  const openEdit = (c: any) => {
    setEditing(c); setName(c.name); setDescrip(c.description ?? ""); setTotalAmount(String(c.total_amount)); setCurrentBalance(String(c.current_balance)); setCommCategoryId(c.category_id ?? ""); setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !totalAmount || currentBalance === "") { Alert.alert("Error", "Completá nombre, total y saldo."); return }
    setSubmitting(true)
    try {
      const data = { name: name.trim(), description: descrip.trim(), total_amount: parseFloat(totalAmount), current_balance: parseFloat(currentBalance), category_id: commCategoryId || null }
      if (editing) await updateCommitment(editing.id, data)
      else await createCommitment(data)
      setModalOpen(false); load()
    } catch { Alert.alert("Error", "No se pudo guardar.") }
    finally { setSubmitting(false) }
  }

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar compromiso", "¿Estás segura?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => { await deleteCommitment(id); load() }},
    ])
  }

  const openPayment = (commId: string) => {
    setPaymentCommId(commId); setPayAmount(""); setPayCapital(""); setPayNotes(""); setPayDate(new Date().toISOString().split("T")[0]); setPaymentModalOpen(true)
  }

  const handlePayment = async () => {
    if (!payAmount || !payCapital || !paymentCommId) { Alert.alert("Error", "Completá monto y capital."); return }
    setSubmitting(true)
    try {
      await createCommitmentPayment({ commitment_id: paymentCommId, amount: parseFloat(payAmount), capital_amount: parseFloat(payCapital), date: payDate, notes: payNotes.trim() })
      setPaymentModalOpen(false); load()
    } catch { Alert.alert("Error", "No se pudo registrar.") }
    finally { setSubmitting(false) }
  }

  const openHistory = async (comm: any) => {
    setHistoryTitle(comm.name)
    const payments = await getCommitmentPayments(comm.id)
    setHistoryData(payments)
    setHistoryModalOpen(true)
  }

  if (loading) return (
    <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  )

  const totalDeuda = commitments.reduce((s: number, c: any) => s + Number(c.current_balance), 0)
  const totalOriginal = commitments.reduce((s: number, c: any) => s + Number(c.total_amount), 0)

  const filtered = commitments.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between px-4 mb-3">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.back()}><X size={18} color="#64748b" /></TouchableOpacity>
          <Text className="text-lg font-bold text-slate-800">Compromisos</Text>
        </View>
        <TouchableOpacity onPress={openNew} className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center gap-1.5">
          <Plus size={14} color="white" /><Text className="text-xs font-semibold text-white">Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="mx-4 mb-3">
        <View className="flex-row items-center bg-white rounded-xl border border-slate-200 px-3 h-9">
          <Search size={14} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-2 text-xs text-slate-800"
            placeholder="Buscar compromiso..."
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

      <View className="flex-row gap-3 mx-4 mb-3">
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Deuda total</Text>
          <Text className="text-sm font-bold text-rose-600">{formatCurrency(totalDeuda)}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Pagado</Text>
          <Text className="text-sm font-bold text-emerald-600">{formatCurrency(totalOriginal - totalDeuda)}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Compromisos</Text>
          <Text className="text-sm font-bold text-slate-800">{commitments.length}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Progreso</Text>
          <Text className="text-sm font-bold text-indigo-600">{totalOriginal > 0 ? Math.round(((totalOriginal - totalDeuda) / totalOriginal) * 100) : 0}%</Text>
        </View>
      </View>

      <View className="flex-1">
        <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}>
          {filtered.length === 0 ? (
            <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
              <CircleDollarSign size={32} color="#cbd5e1" />
              <Text className="text-xs text-slate-400 mt-2">{search ? "Sin resultados" : "Sin compromisos"}</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {filtered.map((c: any) => {
                const progress = Number(c.total_amount) > 0 ? ((Number(c.total_amount) - Number(c.current_balance)) / Number(c.total_amount)) * 100 : 0
                return (
                  <View key={c.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 mr-2">
                        <Text className="text-sm font-semibold text-slate-800">{c.name}</Text>
                        {c.description ? <Text className="text-[10px] text-slate-400">{c.description}</Text> : null}
                      </View>
                      <View className="flex-row gap-1">
                        <TouchableOpacity onPress={() => openPayment(c.id)} className="p-1.5 bg-emerald-100 rounded-lg"><ArrowDownCircle size={14} color="#059669" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => openHistory(c)} className="p-1.5 bg-indigo-100 rounded-lg"><History size={12} color="#4f46e5" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => openEdit(c)} className="p-1.5 bg-slate-100 rounded-lg"><Pencil size={12} color="#64748b" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(c.id)} className="p-1.5 bg-rose-100 rounded-lg"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
                      </View>
                    </View>
                    <View className="h-2 bg-slate-100 rounded-full mb-1.5 overflow-hidden">
                      <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs font-semibold text-rose-600">Saldo: {formatCurrency(Number(c.current_balance))}</Text>
                      <Text className="text-[10px] text-slate-400">Total: {formatCurrency(Number(c.total_amount))}</Text>
                    </View>
                    {c.budget_categories?.name ? <Text className="text-[10px] text-slate-400 mt-1">Rubro: {c.budget_categories.name}</Text> : null}
                  </View>
                )
              })}
            </View>
          )}
          <View className="h-4" />
        </ScrollView>

        <View className="bg-white border-t border-slate-200 px-4 py-3 shadow-lg" style={{ paddingBottom: insets.bottom + 8 }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-medium text-slate-500">Saldo restante total</Text>
            <Text className="text-sm font-bold text-rose-600">{formatCurrency(filtered.reduce((s: number, c: any) => s + Number(c.current_balance), 0))}</Text>
          </View>
        </View>
      </View>

      {/* Commitment Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editing ? "Editar compromiso" : "Nuevo compromiso"}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView className="max-h-96">
              <View className="space-y-3">
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Nombre</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="¿Qué compromiso?" placeholderTextColor="#94a3b8" value={name} onChangeText={setName} />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Descripción</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Detalle..." placeholderTextColor="#94a3b8" value={descrip} onChangeText={setDescrip} />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Monto total</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={totalAmount} onChangeText={setTotalAmount} keyboardType="decimal-pad" />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Saldo actual</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={currentBalance} onChangeText={setCurrentBalance} keyboardType="decimal-pad" />
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Rubro (opcional)</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    <TouchableOpacity onPress={() => setCommCategoryId("")} className={`px-3 py-1.5 rounded-xl border ${!commCategoryId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                      <Text className={`text-xs ${!commCategoryId ? "text-white" : "text-slate-400"}`}>Sin rubro</Text>
                    </TouchableOpacity>
                    {categories.map((cat: any) => (
                      <TouchableOpacity key={cat.id} onPress={() => setCommCategoryId(cat.id)} className={`px-3 py-1.5 rounded-xl border ${commCategoryId === cat.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                        <Text className={`text-xs ${commCategoryId === cat.id ? "text-white" : "text-slate-600"}`}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity onPress={handleSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">{editing ? "Guardar cambios" : "Crear"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={paymentModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">Registrar pago</Text>
              <TouchableOpacity onPress={() => setPaymentModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View className="space-y-3">
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Monto del pago</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" />
              </View>
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Abono a capital</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={payCapital} onChangeText={setPayCapital} keyboardType="decimal-pad" />
              </View>
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Fecha</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" value={payDate} onChangeText={setPayDate} />
              </View>
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Nota</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Opcional" placeholderTextColor="#94a3b8" value={payNotes} onChangeText={setPayNotes} />
              </View>
            </View>
            <TouchableOpacity onPress={handlePayment} disabled={submitting} className="h-11 rounded-xl bg-emerald-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">Registrar pago</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* History Modal */}
      <Modal visible={historyModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl max-h-[70%]" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{historyTitle}</Text>
              <TouchableOpacity onPress={() => setHistoryModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView>
              {historyData.length === 0 ? (
                <Text className="text-xs text-slate-400 text-center py-4">Sin pagos registrados</Text>
              ) : (
                <View className="space-y-2">
                  {historyData.map((p: any) => (
                    <View key={p.id} className="flex-row items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                      <View>
                        <Text className="text-xs font-medium text-slate-800">{formatCurrency(Number(p.amount))}</Text>
                        <Text className="text-[10px] text-slate-400">Capital: {formatCurrency(Number(p.capital_amount))}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[10px] text-slate-500">{formatDate(p.date)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
