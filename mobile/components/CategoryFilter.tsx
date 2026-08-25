import { useState } from "react"
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from "react-native"
import { Check } from "lucide-react-native"

interface CategoryFilterProps {
  items: string[]
  value: string[] | null
  onChange: (next: string[] | null) => void
}

export default function CategoryFilter({ items, value, onChange }: CategoryFilterProps) {
  const [visible, setVisible] = useState(false)

  const isAll = value === null
  const label = isAll ? "Todas" : value.length === 0 ? "Ninguna" : `${value.length} ${value.length === 1 ? "categoría" : "categorías"}`

  const open = () => {
    setVisible(true)
  }

  const toggleItem = (name: string) => {
    if (isAll) {
      onChange(items.filter((i) => i !== name))
      return
    }
    const next = value.filter((v) => v !== name)
    onChange(value.includes(name) ? next : [...next, name])
  }

  const toggleAll = () => {
    onChange(isAll ? [] : null)
  }

  const confirm = () => {
    setVisible(false)
  }

  return (
    <>
      <TouchableOpacity
        onPress={open}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "white",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#e2e8f0",
          paddingHorizontal: 10,
          paddingVertical: 6,
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "600", color: "#4f46e5" }}>Categorías: {label}</Text>
        <Text style={{ fontSize: 10, color: "#94a3b8" }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <Pressable onPress={() => setVisible(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}>
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
              maxHeight: "75%",
              paddingTop: 24,
              paddingBottom: 24,
              paddingHorizontal: 24,
            }}
          >
            <View style={{ width: 36, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#94a3b8", letterSpacing: 1, marginBottom: 12 }}>CATEGORÍAS</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                onPress={toggleAll}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}
              >
                <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: isAll ? "#4f46e5" : value.length > 0 ? "#eef2ff" : "white", borderWidth: isAll ? 0 : 1, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center" }}>
                  {isAll && <Check size={12} color="white" />}
                </View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e293b" }}>Todas las categorías</Text>
              </TouchableOpacity>
              {items.map((name) => {
                const selected = isAll || value.includes(name)
                return (
                  <TouchableOpacity
                    key={name}
                    onPress={() => toggleItem(name)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: selected ? "#4f46e5" : "white", borderWidth: selected ? 0 : 1, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center" }}>
                      {selected && <Check size={12} color="white" />}
                    </View>
                    <Text style={{ fontSize: 13, color: "#334155", flex: 1 }} numberOfLines={1}>{name}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={confirm}
              style={{ backgroundColor: "#4f46e5", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 16 }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "white" }}>Confirmar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}