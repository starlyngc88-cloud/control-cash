import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/providers/AuthProvider"
import { useRouter, type Href } from "expo-router"
import { LogOut, User, Mail, ShieldCheck, CalendarClock, CircleDollarSign, LayoutTemplate, Users, Settings, ChevronRight, type LucideIcon } from "lucide-react-native"

const LINKS: { label: string; icon: LucideIcon; route: Href; color: string; bg: string }[] = [
  { label: "Gastos Futuros", icon: CalendarClock, route: "/gastos-futuros", color: "#f59e0b", bg: "bg-amber-50" },
  { label: "Compromisos", icon: CircleDollarSign, route: "/compromisos", color: "#e11d48", bg: "bg-rose-50" },
  { label: "Presupuestos", icon: LayoutTemplate, route: "/presupuestos", color: "#059669", bg: "bg-emerald-50" },
  { label: "Personas", icon: Users, route: "/personas", color: "#4f46e5", bg: "bg-indigo-50" },
  { label: "Personalización", icon: Settings, route: "/personalizacion", color: "#64748b", bg: "bg-slate-100" },
]

export default function AjustesScreen() {
  const insets = useSafeAreaInsets()
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás segura?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: async () => {
        await signOut()
        router.replace("/(auth)/login")
      }},
    ])
  }

  return (
    <ScrollView className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <Text className="text-lg font-bold text-slate-800 px-4 mb-4">Ajustes</Text>

      {/* Profile */}
      <View className="mx-4 bg-white rounded-xl p-4 border border-slate-100 shadow-sm mb-3">
        <View className="flex-row items-center gap-3">
          <View className="size-10 rounded-full bg-indigo-100 items-center justify-center">
            <User size={18} color="#4f46e5" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-800">{user?.email?.split("@")[0] ?? "Usuario"}</Text>
            <Text className="text-[10px] text-slate-400">KellyCash</Text>
          </View>
        </View>
      </View>

      {/* Info */}
      <View className="mx-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-3">
        <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
          <Mail size={14} color="#64748b" />
          <Text className="text-xs text-slate-600 ml-3 flex-1">{user?.email ?? ""}</Text>
        </View>
        <View className="flex-row items-center px-4 py-3">
          <ShieldCheck size={14} color="#64748b" />
          <Text className="text-xs text-slate-600 ml-3 flex-1">Sesión activa</Text>
          <View className="w-2 h-2 rounded-full bg-emerald-500" />
        </View>
      </View>

      {/* Navigation Links */}
      <View className="mx-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-3">
        {LINKS.map((link, i) => {
          const Icon = link.icon
          return (
            <TouchableOpacity
              key={link.label}
              onPress={() => router.push(link.route)}
              className={`flex-row items-center px-4 py-3.5 ${i < LINKS.length - 1 ? "border-b border-slate-100" : ""}`}
            >
              <View className={`size-8 rounded-lg items-center justify-center ${link.bg}`}>
                <Icon size={14} color={link.color} />
              </View>
              <Text className="flex-1 text-xs font-medium text-slate-700 ml-3">{link.label}</Text>
              <ChevronRight size={14} color="#cbd5e1" />
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Logout */}
      <View className="mx-4 mb-8">
        <TouchableOpacity onPress={handleLogout} className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 border border-rose-200">
          <LogOut size={14} color="#e11d48" />
          <Text className="text-xs font-semibold text-rose-600">Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
