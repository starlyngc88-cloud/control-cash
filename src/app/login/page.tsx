"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim()) {
      setError("⚠️ Completa todos los campos.")
      return
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("⚠️ Las contraseñas no coinciden.")
      return
    }

    if (password.length < 4) {
      setError("⚠️ La contraseña debe tener al menos 4 caracteres.")
      return
    }

    setBusy(true)

    const err = mode === "login"
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password)

    setBusy(false)

    if (err) {
      setError(err)
      return
    }

    router.push("/")
  }

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login")
    setError("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg mx-auto">
            <Wallet className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">🔐 Bienvenido a KellyCash</h1>
          <p className="text-sm text-muted-foreground">Entra pa&apos; revisar la platica.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
            {mode === "login" ? "So Va" : "Crear Cuenta"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            {mode === "login"
              ? "¿No tienes cuenta? Créala aquí"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  )
}
