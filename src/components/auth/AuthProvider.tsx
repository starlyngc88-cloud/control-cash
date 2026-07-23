"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

type Role = "admin" | "user" | null

type AuthContextValue = {
  user: User | null
  role: Role
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchRole = useCallback(async (userEmail: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role, allowed_user:allowed_users!inner(email)")
      .eq("allowed_user.email", userEmail)
      .maybeSingle()
    setRole(data?.role as Role ?? null)
  }, [])

  const refreshRole = useCallback(async () => {
    if (!user?.email) return
    await fetchRole(user.email)
  }, [user, fetchRole])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        if (session.user.email) await fetchRole(session.user.email)
      }
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user?.email) {
        fetchRole(session.user.email)
      } else {
        setRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchRole])

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes("Invalid login credentials")) return "⚠️ Contraseña incorrecta."
      if (error.message.includes("Invalid email")) return "⚠️ Revisa el correo."
      return "⚠️ Epa, algo salió mal."
    }
    router.refresh()
    return null
  }, [router])

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data: allowed } = await supabase
      .from("allowed_users")
      .select("id, active")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle()

    if (!allowed) return "⚠️ Este correo no está autorizado para usar KellyCash."
    if (!allowed.active) return "⚠️ Este correo no está autorizado para usar KellyCash."

    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: { data: { email: email.toLowerCase().trim() } },
    })
    if (error) {
      if (error.message.includes("already registered")) return "⚠️ Este correo ya está registrado. Inicia sesión."
      if (error.message.includes("assword")) return "⚠️ La contraseña debe tener al menos 6 caracteres."
      return "⚠️ Epa, algo salió mal."
    }

    // Asignar rol si no existe (respeta roles predefinidos como admin)
    const { data: existing } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", allowed.id)
      .maybeSingle()
    if (!existing) {
      await supabase.from("user_roles").insert({
        user_id: allowed.id,
        role: "user",
      })
    }

    return null
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
    router.push("/login")
    router.refresh()
  }, [router])

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isAdmin: role === "admin",
        signIn,
        signUp,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
