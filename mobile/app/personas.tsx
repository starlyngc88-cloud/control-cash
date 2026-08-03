import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { getPeople, createPerson, updatePerson, deletePerson } from "@/services/api"
import { Plus, Users, Pencil, Trash2, X } from "lucide-react-native"
import type { Person } from "@/types/database"

export default function PersonasScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    const p = await getPeople()
    setPeople(p); setLoading(false); setRefreshing(false)
  }, [])

  useEffect(() => { void (async () => { await load() })() }, [load])

  const openNew = () => { setEditing(null); setName(""); setModalOpen(true) }

  const openEdit = (p: Person) => { setEditing(p); setName(p.name); setModalOpen(true) }

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert("Error", "Ingresá un nombre."); return }
    setSubmitting(true)
    try {
      if (editing) await updatePerson(editing.id, { name: name.trim() })
      else await createPerson({ name: name.trim() })
      setModalOpen(false); load()
    } catch { Alert.alert("Error", "No se pudo guardar.") }
    finally { setSubmitting(false) }
  }

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar persona", "¿Estás segura?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => { await deletePerson(id); load() }},
    ])
  }

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
          <Text className="text-lg font-bold text-slate-800">Personas</Text>
        </View>
        <TouchableOpacity onPress={openNew} className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center gap-1.5">
          <Plus size={14} color="white" /><Text className="text-xs font-semibold text-white">Nueva</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}>
        {people.length === 0 ? (
          <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
            <Users size={32} color="#cbd5e1" />
            <Text className="text-xs text-slate-400 mt-2">Sin personas registradas</Text>
          </View>
        ) : (
          <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {people.map((p: Person) => (
              <View key={p.id} className="flex-row items-center px-4 py-3.5 border-b border-slate-100 last:border-b-0">
                <View className="size-8 rounded-full bg-indigo-100 items-center justify-center">
                  <Users size={14} color="#4f46e5" />
                </View>
                <Text className="flex-1 text-sm font-medium text-slate-800 ml-3">{p.name}</Text>
                <TouchableOpacity onPress={() => openEdit(p)} className="p-1.5"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(p.id)} className="p-1.5"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View className="flex-1 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editing ? "Editar persona" : "Nueva persona"}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <TextInput className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 mb-4" placeholder="Nombre" placeholderTextColor="#94a3b8" value={name} onChangeText={setName} />
            <TouchableOpacity onPress={handleSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">{editing ? "Guardar cambios" : "Crear"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
