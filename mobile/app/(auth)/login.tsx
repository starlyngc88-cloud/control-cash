import { useRef, useState } from "react"
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/providers/AuthProvider"
import { Wallet } from "lucide-react-native"

export default function LoginScreen() {
  const router = useRouter()
  const { signIn, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const passwordInputRef = useRef<TextInput>(null)
  const confirmInputRef = useRef<TextInput>(null)

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setConfirmPassword("")
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Completá todos los campos.")
      return
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden.")
      return
    }

    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.")
      return
    }

    setLoading(true)

    if (isLogin) {
      const { error } = await signIn(email.trim(), password)
      setLoading(false)
      if (error) {
        Alert.alert("Error", error)
      } else {
        router.replace("/(tabs)")
      }
    } else {
      const { error } = await signUp(email.trim(), password)
      setLoading(false)
      if (error) {
        Alert.alert("Error", error)
      } else {
        Alert.alert("Cuenta creada", "Ahora iniciá sesión con tus datos.")
        setIsLogin(true)
        setPassword("")
        setConfirmPassword("")
      }
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Wallet size={28} color="#4f46e5" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1e293b", letterSpacing: 0.5 }}>KellyCash</Text>
          <Text style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>La platica bajo control</Text>
        </View>

        <View style={{ backgroundColor: "white", borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#f1f5f9" }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#1e293b", marginBottom: 20 }}>
            {isLogin ? "Iniciar sesión" : "Crear cuenta"}
          </Text>

          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569", marginBottom: 6 }}>Correo electrónico</Text>
              <TextInput
                style={{ height: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "white", fontSize: 14, color: "#1e293b" }}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569", marginBottom: 6 }}>Contraseña</Text>
              <TextInput
                ref={passwordInputRef}
                style={{ height: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "white", fontSize: 14, color: "#1e293b" }}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType={isLogin ? "go" : "next"}
                onSubmitEditing={isLogin ? handleSubmit : () => confirmInputRef.current?.focus()}
              />
            </View>

            {!isLogin && (
              <View>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569", marginBottom: 6 }}>Confirmar contraseña</Text>
                <TextInput
                  ref={confirmInputRef}
                  style={{ height: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "white", fontSize: 14, color: "#1e293b" }}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={{ height: 44, borderRadius: 12, backgroundColor: loading ? "#a5b4fc" : "#4f46e5", alignItems: "center", justifyContent: "center", marginTop: 8 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: "600", color: "white" }}>
                  {isLogin ? "Entrar" : "Crear Cuenta"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleMode} style={{ alignItems: "center", marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: "#64748b", fontWeight: "500" }}>
                {isLogin ? "¿No tienes cuenta? Créala aquí" : "¿Ya tienes cuenta? Inicia sesión"}
              </Text>
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity onPress={() => router.push("/forgot-password")} style={{ alignItems: "center", marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: "#4f46e5", fontWeight: "500" }}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
