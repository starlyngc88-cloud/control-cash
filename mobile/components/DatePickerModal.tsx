import { useState } from "react"
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

interface DatePickerModalProps {
  date: Date
  onChange: (date: Date) => void
  visible: boolean
  onClose: () => void
}

export default function DatePickerModal({ date, onChange, visible, onClose }: DatePickerModalProps) {
  const insets = useSafeAreaInsets()
  const [year, setYear] = useState(date.getFullYear())
  const [month, setMonth] = useState(date.getMonth())
  const [day, setDay] = useState(date.getDate())

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const handleConfirm = () => {
    onChange(new Date(year, month, Math.min(day, daysInMonth)))
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}>
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
            paddingBottom: insets.bottom + 20,
            paddingTop: 24,
            paddingHorizontal: 24,
          }}
        >
          <View style={{ width: 36, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={{ padding: 4 }}>
              <ChevronLeft size={18} color="#64748b" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1e293b" }}>{year}</Text>
            <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={{ padding: 4 }}>
              <ChevronRight size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
            {MONTHS.map((name, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => { setMonth(idx); setDay(Math.min(day, new Date(year, idx + 1, 0).getDate())) }}
                style={{
                  width: "24%",
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: month === idx ? "#4f46e5" : "#f8fafc",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: month === idx ? "white" : "#475569" }}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 20 }}>
            {DAYS.slice(0, daysInMonth).map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDay(d)}
                style={{
                  width: "13%",
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: day === d ? "#4f46e5" : "#f8fafc",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: day === d ? "white" : "#475569" }}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            style={{
              backgroundColor: "#4f46e5",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "white" }}>Confirmar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
