import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getSavings, createSaving, updateSaving, deleteSaving, createSavingMovement } from "@/services/api"
import { formatCurrency } from "@/utils/format"
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription"
import { Plus, PiggyBank, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, X } from "lucide-react-native"

export default function HuchaScreen() {
  const insets = useSafeAreaInsets()
  const [savings, setSavings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingModalOpen, setSavingModalOpen] = useState(false)
  const [movementModalOpen, setMovementModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [movementSavingId, setMovementSavingId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [movType, setMovType] = useState<"income" | "withdrawal">("income")
  const [movAmount, setMovAmount] = useState("")
  const [movNotes, setMovNotes] = useState("")

  const load = useCallback(async () => {
    const s = await getSavings()
    setSavings(s)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])
  useRealtimeSubscription("savings", () => load(), () => load(), () => load())

  const openNew = () => {
    setEditing(null); setName(""); setDescription(""); setTargetAmount(""); setSavingModalOpen(true)
  }

  const openEdit = (s: any) => {
    setEditing(s); setName(s.name); setDescription(s.description ?? ""); setTargetAmount(String(s.target_amount)); setSavingModalOpen(true)
  }

  const handleSavingSubmit = async () => {
    if (!name.trim() || !targetAmount) { Alert.alert("Error", "Completá nombre y meta."); return }
    setSubmitting(true)
    try {
      const data = { name: name.trim(), description: description.trim() || null, target_amount: parseFloat(targetAmount) }
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

  const openMovement = (savingId: string, type: "income" | "withdrawal") => {
    setMovementSavingId(savingId); setMovType(type); setMovAmount(""); setMovNotes(""); setMovementModalOpen(true)
  }

  const handleMovementSubmit = async () => {
    if (!movAmount || !movementSavingId) { Alert.alert("Error", "Completá el monto."); return }
    setSubmitting(true)
    try {
      const saving = savings.find((s) => s.id === movementSavingId)
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
          date: new Date().toISOString().split("T")[0],
        }),
        updateSaving(movementSavingId, { current_amount: newCurrent }),
      ])
      setMovementModalOpen(false); load()
    } catch { Alert.alert("Error", "No se pudo registrar.") }
    finally { setSubmitting(false) }
  }

  const totalAhorrado = savings.reduce((s: number, sv: any) => s + Number(sv.current_amount), 0)

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
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

      <View className="mx-4 mb-3">
        <View className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <Text className="text-[10px] font-medium text-slate-500 mb-0.5">Total ahorrado</Text>
          <Text className="text-xl font-bold text-emerald-600">{formatCurrency(totalAhorrado)}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}>
        {savings.length === 0 ? (
          <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
            <PiggyBank size={32} color="#cbd5e1" />
            <Text className="text-xs text-slate-400 mt-2">No hay huchas aún</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {savings.map((s) => {
              const progress = Number(s.target_amount) > 0 ? Math.min(100, (Number(s.current_amount) / Number(s.target_amount)) * 100) : 0
              return (
                <View key={s.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>{s.name}</Text>
                    <View className="flex-row gap-1">
                      <TouchableOpacity onPress={() => openMovement(s.id, "income")} className="p-1.5 bg-emerald-100 rounded-lg">
                        <ArrowDownCircle size={14} color="#059669" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openMovement(s.id, "withdrawal")} className="p-1.5 bg-amber-100 rounded-lg">
                        <ArrowUpCircle size={14} color="#d97706" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openEdit(s)} className="p-1.5 bg-slate-100 rounded-lg">
                        <Pencil size={12} color="#64748b" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(s.id)} className="p-1.5 bg-rose-100 rounded-lg">
                        <Trash2 size={12} color="#e11d48" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {s.description ? <Text className="text-[10px] text-slate-400 mb-2">{s.description}</Text> : null}
                  <View className="h-2 bg-slate-100 rounded-full mb-1.5 overflow-hidden">
                    <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-semibold text-emerald-600">{formatCurrency(Number(s.current_amount))}</Text>
                    <Text className="text-[10px] text-slate-400">Meta: {formatCurrency(Number(s.target_amount))}</Text>
                  </View>
                </View>
              )
            })}
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
            </View>
            <TouchableOpacity onPress={handleSavingSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">{editing ? "Guardar cambios" : "Crear meta"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    </View>
  )
}
