import { Tabs } from "expo-router"
import { View, Text } from "react-native"
import { Chrome as Home, TrendingUp, TrendingDown, PiggyBank, Settings } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

function TabIcon({ icon: Icon, color, size }: { icon: any; color: string; size: number }) {
  return <Icon size={size} color={color} />
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets()

  return (
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
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <TabIcon icon={Home} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="gastos"
        options={{
          title: "Gastos",
          tabBarIcon: ({ color, size }) => <TabIcon icon={TrendingUp} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ingresos"
        options={{
          title: "Ingresos",
          tabBarIcon: ({ color, size }) => <TabIcon icon={TrendingDown} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="hucha"
        options={{
          title: "Hucha",
          tabBarIcon: ({ color, size }) => <TabIcon icon={PiggyBank} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, size }) => <TabIcon icon={Settings} color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
