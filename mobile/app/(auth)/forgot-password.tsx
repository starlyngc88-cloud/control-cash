import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/providers/AuthProvider"
import { ArrowLeft, Wallet } from "lucide-react-native"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Ingresá tu correo electrónico.")
      return
    }
    setLoading(true)
    const { error } = await resetPassword(email.trim())
    setLoading(false)
    if (error) {
      Alert.alert("Error", error)
    } else {
      setSent(true)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-[#f8fafc]">
      <ScrollView contentContainerClassName="flex-1 justify-center px-6" keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1.5 mb-6">
          <ArrowLeft size={16} color="#64748b" />
          <Text className="text-xs text-slate-500">Volver</Text>
        </TouchableOpacity>

        <View className="items-center mb-8">
          <View className="size-14 rounded-2xl bg-indigo-100 items-center justify-center mb-4">
            <Wallet size={28} color="#4f46e5" />
          </View>
          <Text className="text-2xl font-bold text-slate-800 tracking-wide">KellyCash</Text>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          {sent ? (
            <View className="items-center py-4">
              <Text className="text-base font-semibold text-slate-800 mb-2">Correo enviado</Text>
              <Text className="text-xs text-slate-500 text-center leading-5">
                Si existe una cuenta con {email}, recibirás un enlace para restablecer tu contraseña.
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-base font-semibold text-slate-800 mb-1">Recuperar contraseña</Text>
              <Text className="text-xs text-slate-400 mb-5">Te enviaremos un enlace mágico a tu correo</Text>

              <View className="space-y-4">
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1.5">Correo electrónico</Text>
                  <TextInput
                    className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800"
                    placeholder="ejemplo@correo.com"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity onPress={handleSubmit} disabled={loading} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-2">
                  {loading ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">Enviar enlace</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
