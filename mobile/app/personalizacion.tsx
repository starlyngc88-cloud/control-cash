import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, Switch } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useAuth } from "@/providers/AuthProvider"
import { getAllowedUsers, createAllowedUser, updateAllowedUser, deleteAllowedUser, getUserRole, updateUserRole } from "@/services/api"
import { supabase } from "@/lib/supabase"
import { Shield, Users, Key, X, Plus, Trash2, Mail, Lock } from "lucide-react-native"
import type { AllowedUser, UserRole } from "@/types/database"

export default function PersonalizacionScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useAuth()
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([])
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [passModalOpen, setPassModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [language, setLanguage] = useState("standard")
  const [currency, setCurrency] = useState("COP")

  const isAdmin = userRole?.role === "admin"

  const isLastAdmin = async (userId: string) => {
    const targetRole = await getUserRole(userId)
    if (targetRole?.role !== "admin") return false
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin")
    const activeAdminIds = new Set(
      adminRoles
        ?.filter(r => allowedUsers.some(au => au.id === r.user_id && au.active))
        .map(r => r.user_id) ?? []
    )
    return activeAdminIds.size === 1 && activeAdminIds.has(userId)
  }

  const load = useCallback(async () => {
    if (!user) return
    const [users, role] = await Promise.all([getAllowedUsers(), getUserRole(user.id)])
    setAllowedUsers(users)
    setUserRole(role)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const toggleActive = async (au: AllowedUser) => {
    await updateAllowedUser(au.id, { active: !au.active })
    load()
  }

  const handleAddUser = async () => {
    if (!newEmail.trim()) return
    setSubmitting(true)
    try {
      await createAllowedUser({ email: newEmail.trim().toLowerCase(), active: true })
      setNewEmail(""); setUserModalOpen(false); load()
    } catch { Alert.alert("Error", "No se pudo agregar.") }
    finally { setSubmitting(false) }
  }

  const handleDeleteUser = (id: string) => {
    Alert.alert("Eliminar usuario", "¿Estás segura?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        if (await isLastAdmin(id)) {
          Alert.alert("Error", "No puedes desactivar o eliminar al último administrador.")
          return
        }
        await deleteAllowedUser(id); load()
      }},
    ])
  }

  const handleRoleChange = async (userId: string, role: "admin" | "user") => {
    if (role === "user" && await isLastAdmin(userId)) {
      Alert.alert("Error", "No puedes desactivar o eliminar al último administrador.")
      return
    }
    await updateUserRole(userId, role)
    load()
  }

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      Alert.alert("Error", "Verificá los datos.")
      return
    }
    setSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user!.email!, password: currentPassword })
      if (signInError) { Alert.alert("Error", "Contraseña actual incorrecta."); return }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) Alert.alert("Error", error.message)
      else { Alert.alert("Listo", "Contraseña actualizada."); setPassModalOpen(false) }
    } catch { Alert.alert("Error", "No se pudo cambiar.") }
    finally { setSubmitting(false) }
  }

  if (loading) return (
    <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  )

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center gap-2 px-4 mb-4">
        <TouchableOpacity onPress={() => router.back()}><X size={18} color="#64748b" /></TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">Personalización</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Language & Currency */}
        <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-3">
          <View className="px-4 py-3 border-b border-slate-100">
            <Text className="text-sm font-semibold text-slate-800">Idioma y moneda</Text>
          </View>
          <View className="px-4 py-3 border-b border-slate-100">
            <Text className="text-xs font-medium text-slate-600 mb-2">Idioma</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setLanguage("standard")} className={`px-4 py-2 rounded-lg border ${language === "standard" ? "bg-indigo-600 border-indigo-600" : "bg-slate-100 border-slate-200"}`}>
                <Text className={`text-xs font-medium ${language === "standard" ? "text-white" : "text-slate-600"}`}>Standard</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLanguage("kellycaribe")} className={`px-4 py-2 rounded-lg border ${language === "kellycaribe" ? "bg-indigo-600 border-indigo-600" : "bg-slate-100 border-slate-200"}`}>
                <Text className={`text-xs font-medium ${language === "kellycaribe" ? "text-white" : "text-slate-600"}`}>KellyCaribe</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-[10px] text-slate-400 mt-1">Próximamente</Text>
          </View>
          <View className="px-4 py-3">
            <Text className="text-xs font-medium text-slate-600 mb-2">Moneda</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setCurrency("COP")} className={`px-4 py-2 rounded-lg border ${currency === "COP" ? "bg-indigo-600 border-indigo-600" : "bg-slate-100 border-slate-200"}`}>
                <Text className={`text-xs font-medium ${currency === "COP" ? "text-white" : "text-slate-600"}`}>COP $</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCurrency("EUR")} className={`px-4 py-2 rounded-lg border ${currency === "EUR" ? "bg-indigo-600 border-indigo-600" : "bg-slate-100 border-slate-200"}`}>
                <Text className={`text-xs font-medium ${currency === "EUR" ? "text-white" : "text-slate-600"}`}>EUR €</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Security */}
        <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-3">
          <View className="px-4 py-3 border-b border-slate-100">
            <View className="flex-row items-center gap-2">
              <Lock size={14} color="#4f46e5" />
              <Text className="text-sm font-semibold text-slate-800">Seguridad</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setPassModalOpen(true)} className="flex-row items-center px-4 py-3">
            <Key size={14} color="#64748b" />
            <Text className="text-xs text-slate-600 ml-3">Cambiar contraseña</Text>
          </TouchableOpacity>
        </View>

        {/* Users (admin only) */}
        {isAdmin && (
          <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-3">
            <View className="px-4 py-3 border-b border-slate-100 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Users size={14} color="#4f46e5" />
                <Text className="text-sm font-semibold text-slate-800">Usuarios autorizados</Text>
              </View>
              <TouchableOpacity onPress={() => setUserModalOpen(true)} className="bg-indigo-600 px-3 py-1.5 rounded-lg flex-row items-center gap-1">
                <Plus size={12} color="white" /><Text className="text-[10px] font-semibold text-white">Agregar</Text>
              </TouchableOpacity>
            </View>
            {allowedUsers.map((au) => (
              <View key={au.id} className="flex-row items-center px-4 py-3 border-b border-slate-100 last:border-b-0">
                <Mail size={14} color="#64748b" />
                <Text className="flex-1 text-xs text-slate-600 ml-3" numberOfLines={1}>{au.email}</Text>
                <Switch
                  value={au.active}
                  onValueChange={() => toggleActive(au)}
                  trackColor={{ false: "#e2e8f0", true: "#a5b4fc" }}
                  thumbColor={au.active ? "#4f46e5" : "#cbd5e1"}
                />
                <TouchableOpacity onPress={() => handleRoleChange(au.id, userRole?.role === "admin" ? "user" : "admin")} className="mx-2 px-2 py-1 rounded-lg bg-slate-100">
                  <Text className="text-[10px] text-slate-600">{userRole?.role === "admin" ? "Admin" : "User"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteUser(au.id)}><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {!isAdmin && (
          <View className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm items-center">
            <Shield size={24} color="#cbd5e1" />
            <Text className="text-xs text-slate-400 mt-2">Solo los administradores pueden gestionar usuarios</Text>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      {/* Add user modal */}
      <Modal visible={userModalOpen} animationType="fade" transparent>
        <View className="flex-1 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <Text className="text-sm font-semibold text-slate-800 mb-3">Agregar usuario</Text>
            <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 mb-3" placeholder="correo@ejemplo.com" placeholderTextColor="#94a3b8" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity onPress={handleAddUser} disabled={submitting} className="h-10 rounded-xl bg-indigo-600 items-center justify-center">
              <Text className="text-sm font-semibold text-white">Agregar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password modal */}
      <Modal visible={passModalOpen} animationType="slide" transparent>
        <View className="flex-1 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">Cambiar contraseña</Text>
              <TouchableOpacity onPress={() => setPassModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View className="space-y-3">
              <TextInput className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Contraseña actual" placeholderTextColor="#94a3b8" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
              <TextInput className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Nueva contraseña" placeholderTextColor="#94a3b8" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              <TextInput className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Confirmar nueva contraseña" placeholderTextColor="#94a3b8" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            </View>
            <TouchableOpacity onPress={handlePasswordChange} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">Actualizar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
