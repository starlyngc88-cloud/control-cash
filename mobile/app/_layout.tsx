import "../global.css"
import { Slot, usePathname, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider, useAuth } from "@/providers/AuthProvider"
import { UpdateProvider } from "@/providers/UpdateProvider"
import { useWalletNotifications } from "@/hooks/useWalletNotifications"
import { LanguageProvider } from "@/i18n"
import { CashflowFilterProvider } from "@/contexts/CashflowFilterContext"
import { useEffect } from "react"
import { View, ActivityIndicator } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"

function RootLayoutNav() {
  const { user, loading } = useAuth()
  const segments = useSegments()
  const pathname = usePathname()
  const router = useRouter()

  useWalletNotifications()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === "(auth)"
    const atRootIndex = pathname === "/"

    if (user && atRootIndex) {
      router.replace("/(tabs)")
    } else if (!user && !inAuthGroup) {
      router.replace("/(auth)/login")
    }
  }, [user, loading, segments, pathname, router])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }

  return <Slot />
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UpdateProvider>
          <AuthProvider>
            <LanguageProvider>
              <CashflowFilterProvider>
                <StatusBar style="dark" />
                <RootLayoutNav />
              </CashflowFilterProvider>
            </LanguageProvider>
          </AuthProvider>
        </UpdateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
