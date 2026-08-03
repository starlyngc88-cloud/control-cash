import { useState, useRef } from "react"
import { Tabs, useRouter } from "expo-router"
import { View, Text, TouchableOpacity, Modal, Pressable, Animated } from "react-native"
import { Home, TrendingUp, TrendingDown, PiggyBank, Settings, Handshake, Clock, Plus, LayoutTemplate } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const tabs = [
  { name: "index", title: "Inicio", icon: Home },
  { name: "presupuestos", title: "Presupuesto", icon: LayoutTemplate },
  { name: "ingresos", title: "Ingresos", icon: TrendingUp },
  { name: "gastos", title: "Gastos", icon: TrendingDown },
] as const

const moreOptions = [
  { name: "hucha", title: "Hucha", icon: PiggyBank, color: "#f59e0b" },
  { name: "compromisos", title: "Compromisos", icon: Handshake, color: "#8b5cf6" },
  { name: "gastos-futuros", title: "Gastos Futuros", icon: Clock, color: "#06b6d4" },
  { name: "ajustes", title: "Ajustes", icon: Settings, color: "#64748b" },
] as const

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [moreVisible, setMoreVisible] = useState(false)
  const slideAnim = useRef(new Animated.Value(0)).current

  const openMore = () => {
    setMoreVisible(true)
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, damping: 20 }).start()
  }

  const closeMore = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setMoreVisible(false)
    })
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#4f46e5",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopColor: "#e2e8f0",
            borderTopWidth: 1,
            height: 56 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
          },
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, size }) => <tab.icon size={size} color={color} />,
            }}
          />
        ))}
        <Tabs.Screen name="hucha" options={{ href: null }} />
        <Tabs.Screen name="ajustes" options={{ href: null }} />
        <Tabs.Screen name="compromisos" options={{ href: null }} />
        <Tabs.Screen name="gastos-futuros" options={{ href: null }} />
        <Tabs.Screen
          name="more"
          options={{
            title: "Más",
            tabBarButton: () => (
              <TouchableOpacity
                onPress={openMore}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingTop: 6,
                }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={18} color="white" />
                </View>
                <Text style={{ fontSize: 10, fontWeight: "600", color: "#94a3b8", marginTop: 2 }}>Más</Text>
              </TouchableOpacity>
            ),
          }}
        />
      </Tabs>

      <Modal visible={moreVisible} animationType="none" transparent>
        <Pressable onPress={closeMore} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}>
          <Pressable
            onPress={() => {}}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom + 56 + 16,
              paddingTop: 24,
              paddingHorizontal: 24,
            }}
          >
            <View style={{ width: 36, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 16 }}>Más opciones</Text>
            <View style={{ gap: 4 }}>
              {moreOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.name}
                  onPress={() => {
                    closeMore()
                    setTimeout(() => router.push({ pathname: `/(tabs)/${opt.name}` }), 200)
                  }}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${opt.color}18`, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                    <opt.icon size={20} color={opt.color} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#1e293b" }}>{opt.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
