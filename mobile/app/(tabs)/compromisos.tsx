import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { getCommitments, createCommitment, updateCommitment, deleteCommitment, getCommitmentPayments, createCommitmentPayment, getAllBudgetCategories, type CommitmentWithRelations, type BudgetCategoryWithTemplate } from "@/services/api"
import { formatCurrency, formatDate } from "@/utils/format"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { Plus, ShieldCheck, Pencil, Trash2, X, ArrowDownCircle, Search, ChevronDown, ChevronRight } from "lucide-react-native"
import type { CommitmentPayment } from "@/types/database"

export default function CompromisosScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [commitments, setCommitments] = useState<CommitmentWithRelations[]>([])
  const [categories, setCategories] = useState<BudgetCategoryWithTemplate[]>([])
  const [paymentsMap, setPaymentsMap] = useState<Record<string, CommitmentPayment[]>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentCommId, setPaymentCommId] = useState<string | null>(null)
  const [editing, setEditing] = useState<CommitmentWithRelations | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedComm, setExpandedComm] = useState<Set<string>>(new Set())

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
    const [com, cats, pays] = await Promise.all([getCommitments(), getAllBudgetCategories(), getCommitmentPayments()])
    setCommitments(com)
    setCategories(cats.filter((c) => !c.parent_id))
    const map: Record<string, CommitmentPayment[]> = {}
    for (const p of pays) {
      if (!map[p.commitment_id]) map[p.commitment_id] = []
      map[p.commitment_id].push(p)
    }
    setPaymentsMap(map)
    setLoading(false); setRefreshing(false)
  }, [])

  useEffect(() => { void (async () => { await load() })() }, [load])

  useRealtimeSubscription("commitments", () => load(), () => load(), () => load())

  const openNew = () => {
    setEditing(null); setName(""); setDescrip(""); setTotalAmount(""); setCurrentBalance(""); setCommCategoryId(""); setModalOpen(true)
  }

  const openEdit = (c: CommitmentWithRelations) => {
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

  const toggleComm = (id: string) => {
    setExpandedComm((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) return (
    <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  )

  const totalDeuda = commitments.reduce((s: number, c: CommitmentWithRelations) => s + Number(c.current_balance), 0)
  const totalOriginal = commitments.reduce((s: number, c: CommitmentWithRelations) => s + Number(c.total_amount), 0)
  const pagosCount = Object.values(paymentsMap).reduce((s: number, pays: CommitmentPayment[]) => s + pays.length, 0)

  const filtered = commitments.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase()) || c.budget_categories?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const allExpanded = commitments.length > 0 && commitments.every((c) => expandedComm.has(c.id))

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

      <View className="flex-row gap-2 mx-4 mb-3">
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Compromisos</Text>
          <Text className="text-sm font-bold text-slate-800">{commitments.length}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Deuda total</Text>
          <Text className="text-sm font-bold text-rose-600">{formatCurrency(totalDeuda)}</Text>
        </View>
      </View>
      <View className="flex-row gap-2 mx-4 mb-3">
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Progreso</Text>
          <Text className="text-sm font-bold text-emerald-600">{totalOriginal > 0 ? Math.round((1 - totalDeuda / totalOriginal) * 100) : 0}%</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Pagos registrados</Text>
          <Text className="text-sm font-bold text-indigo-600">{pagosCount}</Text>
        </View>
      </View>

      <View className="flex-1">
        <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}>
          {filtered.length === 0 ? (
            <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
              <ShieldCheck size={32} color="#cbd5e1" />
              <Text className="text-xs text-slate-400 mt-2">{search ? "Sin resultados" : "Sin compromisos"}</Text>
            </View>
          ) : (
            <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <View className="flex-row items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Compromisos</Text>
                {commitments.length > 0 && (
                  <TouchableOpacity onPress={() => { if (allExpanded) setExpandedComm(new Set()); else setExpandedComm(new Set(commitments.map((c) => c.id))) }}>
                    <Text className="text-[10px] text-slate-400 underline">{allExpanded ? "Contraer todo" : "Expandir todo"}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {filtered.map((c: CommitmentWithRelations) => {
                const isExpanded = expandedComm.has(c.id)
                const pays = paymentsMap[c.id] ?? []
                const progress = Number(c.total_amount) > 0 ? Math.round((1 - Number(c.current_balance) / Number(c.total_amount)) * 100) : 0
                return (
                  <View key={c.id}>
                    <View className="flex-row items-center px-4 py-2.5 border-b border-slate-200">
                      <TouchableOpacity onPress={() => toggleComm(c.id)} className="mr-1.5">
                        {isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                      </TouchableOpacity>
                      <View className="flex-1 mr-2 min-w-0">
                        <Text className="text-xs font-semibold text-slate-700 truncate">{c.name}</Text>
                        {c.budget_categories?.name ? <Text className="text-[10px] text-slate-400">· {c.budget_categories.name}</Text> : null}
                      </View>
                      <Text className="text-[10px] text-slate-500 tabular-nums">{progress}%</Text>
                      <View className="w-10 h-1 rounded-full bg-slate-200 overflow-hidden ml-1.5">
                        <View className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                      </View>
                      <Text className="ml-2 text-xs font-semibold text-rose-600 tabular-nums">{formatCurrency(Number(c.current_balance))}</Text>
                      <View className="flex-row items-center gap-0.5 ml-1.5">
                        <TouchableOpacity onPress={() => openEdit(c)} className="p-0.5"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(c.id)} className="p-0.5"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
                      </View>
                    </View>
                    {isExpanded && (
                      <View className="bg-white border-b border-slate-100 px-5 py-2.5">
                        {c.description ? <Text className="text-[10px] text-slate-500 mb-2">{c.description}</Text> : null}
                        <TouchableOpacity onPress={() => openPayment(c.id)} className="self-start flex-row items-center gap-1 bg-indigo-600 rounded-lg px-3 py-1.5 mb-2">
                          <ArrowDownCircle size={12} color="white" /><Text className="text-[10px] font-medium text-white">Registrar pago</Text>
                        </TouchableOpacity>
                        {pays.length > 0 ? (() => {
                          const chronological = [...pays].reverse()
                          const balances = new Map<string, number>()
                          let running = Number(c.total_amount)
                          for (const cp of chronological) {
                            running -= Number(cp.capital_amount)
                            balances.set(cp.id, Math.max(0, running))
                          }
                          return (
                            <View className="space-y-1">
                              {pays.map((p: CommitmentPayment) => (
                                <View key={p.id} className="flex-row items-center justify-between px-2.5 py-1.5 bg-slate-50 rounded-lg">
                                  <Text className="text-[10px] text-slate-500">{formatDate(p.date)}{p.notes ? ` · ${p.notes}` : ""}</Text>
                                  <View className="flex-row items-center gap-1.5">
                                    <Text className="text-[10px] font-medium text-rose-600 tabular-nums">{formatCurrency(Number(p.amount))}</Text>
                                    <Text className="text-[10px] text-rose-500 tabular-nums">-{formatCurrency(Number(p.capital_amount))}</Text>
                                    <Text className="text-[10px] text-slate-400 tabular-nums">→ {formatCurrency(balances.get(p.id) ?? 0)}</Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          )
                        })() : (
                          <Text className="text-[10px] text-slate-400">Sin pagos registrados aún.</Text>
                        )}
                      </View>
                    )}
                  </View>
                )
              })}
              <View className="bg-white px-4 py-2.5 border-t border-slate-200 flex-row items-center justify-between">
                <Text className="text-xs text-rose-600 font-medium">Saldo restante total: {formatCurrency(totalDeuda)}</Text>
                <TouchableOpacity onPress={openNew} className="flex-row items-center gap-1">
                  <Plus size={13} color="#4f46e5" /><Text className="text-xs text-indigo-600 font-medium">Nuevo compromiso</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View className="h-4" />
        </ScrollView>
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
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-slate-600 mb-1">Monto total</Text>
                    <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={totalAmount} onChangeText={setTotalAmount} keyboardType="decimal-pad" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-slate-600 mb-1">Saldo actual</Text>
                    <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={currentBalance} onChangeText={setCurrentBalance} keyboardType="decimal-pad" />
                  </View>
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Rubro (opcional)</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    <TouchableOpacity onPress={() => setCommCategoryId("")} className={`px-3 py-1.5 rounded-xl border ${!commCategoryId ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                      <Text className={`text-xs ${!commCategoryId ? "text-white" : "text-slate-400"}`}>Sin rubro</Text>
                    </TouchableOpacity>
                    {categories.map((cat: BudgetCategoryWithTemplate) => (
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
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-medium text-slate-600 mb-1">Monto del pago</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-slate-600 mb-1">Abono a capital</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={payCapital} onChangeText={setPayCapital} keyboardType="decimal-pad" />
                </View>
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
    </View>
  )
}