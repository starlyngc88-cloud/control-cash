import { View, Text, TextInput, type TextInputProps } from "react-native"

type InputProps = TextInputProps & {
  label?: string
  error?: string
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-xs font-medium text-slate-600">{label}</Text> : null}
      <TextInput
        className={`h-11 px-4 rounded-xl border bg-white text-sm text-slate-800 ${error ? "border-rose-400" : "border-slate-200"} ${className}`}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error ? <Text className="text-[10px] text-rose-500">{error}</Text> : null}
    </View>
  )
}
