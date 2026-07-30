import { View, Text } from "react-native"

type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  subtitle?: string
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm items-center">
      {icon ? <View className="mb-3">{icon}</View> : null}
      <Text className="text-sm font-medium text-slate-400 text-center">{title}</Text>
      {subtitle ? <Text className="text-xs text-slate-400 text-center mt-1">{subtitle}</Text> : null}
    </View>
  )
}
