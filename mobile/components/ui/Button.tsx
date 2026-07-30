import { TouchableOpacity, Text, ActivityIndicator, type TouchableOpacityProps } from "react-native"

type ButtonProps = TouchableOpacityProps & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  loading?: boolean
  label: string
}

export function Button({ variant = "primary", loading, label, className = "", disabled, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-indigo-600 active:bg-indigo-700",
    secondary: "bg-white border border-slate-200 active:bg-slate-50",
    ghost: "bg-transparent active:bg-slate-100",
    danger: "bg-rose-600 active:bg-rose-700",
  }
  const textVariants = {
    primary: "text-white",
    secondary: "text-slate-700",
    ghost: "text-indigo-600",
    danger: "text-white",
  }

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      className={`h-11 rounded-xl items-center justify-center flex-row gap-2 ${variants[variant]} ${disabled ? "opacity-50" : ""} ${className}`}
      {...props}
    >
      {loading ? <ActivityIndicator color={variant === "primary" || variant === "danger" ? "white" : "#4f46e5"} /> : null}
      <Text className={`text-sm font-semibold ${textVariants[variant]}`}>{label}</Text>
    </TouchableOpacity>
  )
}
