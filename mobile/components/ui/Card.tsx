import { View, type ViewProps } from "react-native"

type CardProps = ViewProps & {
  variant?: "default" | "elevated"
}

export function Card({ className = "", children, ...props }: CardProps) {
  const base = "bg-white rounded-xl border border-slate-100 shadow-sm"
  return (
    <View className={`${base} ${className}`} {...props}>
      {children}
    </View>
  )
}
