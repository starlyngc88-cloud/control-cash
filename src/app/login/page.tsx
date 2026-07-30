"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, Loader2, Mail, Lock } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { friendlyError } from "@/lib/errors"

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
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

    if (password.length < 6) {
      setError("⚠️ La contraseña debe tener al menos 6 caracteres.")
      return
    }

    setBusy(true)

    try {
      const err = mode === "login"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password)

      setBusy(false)

      if (err) {
        setError(friendlyError(err))
        return
      }
    } catch (err) {
      setBusy(false)
      setError(friendlyError(err))
      return
    }

    if (mode === "register") {
      setMode("login")
      setPassword("")
      setError("")
      setSuccessMsg("✅ Cuenta creada. Ahora inicia sesión.")
      return
    }

    window.location.href = "/"
  }

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login")
    setError("")
    setSuccessMsg("")
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Left brand panel - matches sidebar style from design reference */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
        <div className="relative z-10 text-center px-12">
          <div className="flex items-center justify-center size-20 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto mb-8 ring-1 ring-indigo-500/20">
            <Wallet className="size-10" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-wide mb-3">KellyCash</h1>
          <p className="text-slate-400 text-lg">La platica bajo control</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="flex items-center justify-center size-12 rounded-xl bg-indigo-50 text-indigo-600">
              <Wallet className="size-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800 tracking-wide">KellyCash</span>
          </div>

          {/* Card - matches dashboard card style from design reference */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8">
            <div className="text-center space-y-1 mb-8">
              <h2 className="text-xl font-semibold text-slate-800">
                {mode === "login" ? "Bienvenido de vuelta" : "Crear cuenta"}
              </h2>
              <p className="text-sm text-slate-500">
                {mode === "login"
                  ? "Entrar para revisar como esta la platica"
                  : "Regístrate para empezar a controlar tus finanzas."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all rounded-lg"
                  />
                </div>
              </div>

              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                    Confirmar contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all rounded-lg"
                    />
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMsg}
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
                disabled={busy}
              >
                {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                {mode === "login" ? "So Va" : "Crear Cuenta"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              >
                {mode === "login"
                  ? "¿No tienes cuenta? Créala aquí"
                  : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
