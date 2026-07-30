import { useState, useMemo } from "react"
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from "react-native"
import { ChevronLeft, ChevronRight, Check } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function getMonthId(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

interface DateFilterProps {
  months: string[]
  onChange: (months: string[]) => void
  children?: (props: { onOpen: () => void }) => React.ReactNode
}

export default function DateFilter({ months, onChange }: DateFilterProps) {
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(false)
  const now = useMemo(() => new Date(), [])
  const currentMonth = useMemo(() => getMonthId(now), [now])

  const [year, setYear] = useState(() => {
    if (months.length > 0) return parseInt(months[0].split("-")[0])
    return now.getFullYear()
  })
  const [draft, setDraft] = useState<string[]>(months)
  const [rangeStart, setRangeStart] = useState<string | null>(null)

  const open = () => {
    setDraft(months)
    setRangeStart(null)
    setVisible(true)
  }

  const activePreset = useMemo(() => {
    const sorted = [...draft].sort()
    const fullYear = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`)
    const current = [currentMonth].sort()
    const quarter = (() => {
      const cur = now.getMonth() + 1
      const y = now.getFullYear()
      return [
        `${cur <= 2 ? y - 1 : y}-${String(cur <= 2 ? cur + 10 : cur - 2).padStart(2, "0")}`,
        `${cur <= 1 ? y - 1 : y}-${String(cur <= 1 ? cur + 11 : cur - 1).padStart(2, "0")}`,
        `${y}-${String(cur).padStart(2, "0")}`,
      ]
    })().sort()
    if (sorted.length === current.length && sorted.every((m, i) => m === current[i])) return "current"
    if (sorted.length === quarter.length && sorted.every((m, i) => m === quarter[i])) return "quarter"
    if (sorted.length === fullYear.length && sorted.every((m, i) => m === fullYear[i])) return "year"
    return "custom"
  }, [draft, year, currentMonth, now])

  const applyPreset = (preset: "current" | "quarter" | "year") => {
    if (preset === "current") setDraft([currentMonth])
    else if (preset === "quarter") {
      const cur = now.getMonth() + 1
      const y = now.getFullYear()
      setDraft([
        `${cur <= 2 ? y - 1 : y}-${String(cur <= 2 ? cur + 10 : cur - 2).padStart(2, "0")}`,
        `${cur <= 1 ? y - 1 : y}-${String(cur <= 1 ? cur + 11 : cur - 1).padStart(2, "0")}`,
        `${y}-${String(cur).padStart(2, "0")}`,
      ])
    } else setDraft(Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`))
    setRangeStart(null)
  }

  const handleMonthClick = (monthStr: string) => {
    const key = `${year}-${monthStr}`
    setDraft((prev) => {
      if (prev.includes(key)) {
        setRangeStart(null)
        return prev.filter((m) => m !== key)
      }
      if (rangeStart) {
        const sorted = [rangeStart, key].sort()
        const [y1, m1] = sorted[0].split("-").map(Number)
        const [y2, m2] = sorted[1].split("-").map(Number)
        const start = y1 * 12 + m1
        const end = y2 * 12 + m2
        const range: string[] = []
        for (let i = start; i <= end; i++) {
          const y = Math.floor((i - 1) / 12)
          const m = ((i - 1) % 12) + 1
          range.push(`${y}-${String(m).padStart(2, "0")}`)
        }
        const merged = [...new Set([...prev, ...range])].sort()
        setRangeStart(null)
        return merged
      }
      setRangeStart(key)
      return [...prev, key].sort()
    })
  }

  const label = useMemo(() => {
    if (months.length === 0) return "Seleccionar"
    if (months.length === 1) {
      const [y, m] = months[0].split("-")
      return `${MONTHS_SHORT[parseInt(m) - 1]} ${y}`
    }
    const sorted = [...months].sort()
    const [y1, m1] = sorted[0].split("-").map(Number)
    const [y2, m2] = sorted[sorted.length - 1].split("-").map(Number)
    if (y1 === y2) return `${MONTHS_SHORT[m1 - 1]} - ${MONTHS_SHORT[m2 - 1]} ${y1}`
    return `${sorted[0]} - ${sorted[sorted.length - 1]}`
  }, [months])

  return (
    <>
      <TouchableOpacity
        onPress={open}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "white",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#e2e8f0",
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#4f46e5" }}>{label}</Text>
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
              maxHeight: "80%",
              paddingBottom: insets.bottom + 16,
              paddingTop: 24,
              paddingHorizontal: 24,
            }}
          >
            <View style={{ width: 36, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
            <ScrollView>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#94a3b8", letterSpacing: 1 }}>PERÍODO</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={{ padding: 4 }}>
                    <ChevronLeft size={16} color="#64748b" />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>{year}</Text>
                  <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={{ padding: 4 }}>
                    <ChevronRight size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
                {(["current", "quarter", "year"] as const).map((preset) => {
                  const isActive = activePreset === preset
                  const label = preset === "current" ? "Este Mes" : preset === "quarter" ? "Trimestre" : "Año"
                  return (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => applyPreset(preset)}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        backgroundColor: isActive ? "#4f46e5" : "white",
                        borderColor: isActive ? "#4f46e5" : "#e2e8f0",
                      }}
                    >
                      {isActive && <Check size={12} color="white" />}
                      <Text style={{ fontSize: 11, fontWeight: "600", color: isActive ? "white" : "#475569" }}>{label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
                {MONTHS_SHORT.map((name, idx) => {
                  const monthStr = String(idx + 1).padStart(2, "0")
                  const key = `${year}-${monthStr}`
                  const isSelected = draft.includes(key)
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleMonthClick(monthStr)}
                      style={{
                        width: "31%",
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isSelected ? "#4f46e5" : "#f8fafc",
                        alignItems: "center",
                        borderWidth: rangeStart === key ? 2 : 0,
                        borderColor: "#818cf8",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: isSelected ? "white" : "#475569" }}>{name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <TouchableOpacity
                onPress={() => { onChange(draft); setVisible(false) }}
                style={{
                  backgroundColor: "#4f46e5",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "white" }}>
                  Confirmar ({draft.length} {draft.length === 1 ? "Mes" : "Meses"})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
