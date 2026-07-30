import { View, Text } from "react-native"

type BadgeProps = {
  label: string
  variant?: "default" | "emerald" | "rose" | "amber" | "indigo"
}

export function Badge({ label, variant = "default" }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-indigo-100 text-indigo-700",
  }
  return (
    <View className={`px-2.5 py-1 rounded-lg ${variants[variant].split(" ")[0]}`}>
      <Text className={`text-[10px] font-medium ${variants[variant].split(" ")[1]}`}>{label}</Text>
    </View>
  )
}
