import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { findOrCreatePersonForUser } from "@/services/api"
import type { Person } from "@/types/database"
import type { Session, User } from "@supabase/supabase-js"

const DEBUG_LOGS = typeof __DEV__ !== "undefined" ? __DEV__ : true

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  person: Person | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, person: null,
  signIn: async () => ({ error: "Not initialized" }),
  signUp: async () => ({ error: "Not initialized" }),
  signOut: async () => {},
  resetPassword: async () => ({ error: "Not initialized" }),
  updatePassword: async () => ({ error: "Not initialized" }),
})

async function loadPerson(userId: string, email: string): Promise<Person | null> {
  try {
    return await findOrCreatePersonForUser(userId, email)
  } catch (err) {
    console.error("[KellyCash][Mobile][Auth] Failed to load/create person", err)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [person, setPerson] = useState<Person | null>(null)

  useEffect(() => {
    let active = true
    const timeout = setTimeout(() => {
      if (active) {
        console.warn("[KellyCash][Mobile][Auth] getSession tardó demasiado, se fuerza salir del estado de carga")
        setLoading(false)
      }
    }, 8000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        if (DEBUG_LOGS) {
          console.log("[KellyCash][Mobile][Auth] init session", {
            userId: session?.user?.id ?? null,
            email: session?.user?.email ?? null,
            expiresAt: session?.expires_at ?? null,
          })
        }
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) {
          loadPerson(session.user.id, session.user.email ?? "").then((p) => {
            if (active) setPerson(p)
          })
        }
      })
      .catch((error) => {
        console.error("[KellyCash][Mobile][Auth] getSession failed", error)
        if (active) setLoading(false)
      })
      .finally(() => clearTimeout(timeout))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (DEBUG_LOGS) {
        console.log("[KellyCash][Mobile][Auth] state changed", {
          event,
          userId: session?.user?.id ?? null,
          email: session?.user?.email ?? null,
          expiresAt: session?.expires_at ?? null,
        })
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        loadPerson(session.user.id, session.user.email ?? "").then((p) => {
          if (active) setPerson(p)
        })
      } else {
        setPerson(null)
      }
    })

    return () => {
      active = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? `⚠️ ${error.message}` : null }
  }

  const signUp = async (email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim()
    const { data: allowed } = await supabase
      .from("allowed_users")
      .select("id, active")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (!allowed) return { error: "⚠️ Este correo no está autorizado para usar KellyCash." }
    if (!allowed.active) return { error: "⚠️ Este correo no está autorizado para usar KellyCash." }

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { email: normalizedEmail } },
    })
    if (error) {
      const msg = error.message
      if (msg.includes("already registered")) return { error: "⚠️ Este correo ya está registrado. Inicia sesión." }
      if (msg.includes("assword")) return { error: "⚠️ La contraseña debe tener al menos 6 caracteres." }
      return { error: `⚠️ ${msg}` }
    }

    const { data: { session: newSession } } = await supabase.auth.getSession()
    const authUserId = newSession?.user?.id
    if (authUserId) {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", authUserId)
        .maybeSingle()
      if (!existing) {
        await supabase.from("user_roles").insert({ user_id: authUserId, role: "user" })
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setPerson(null)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "kellycash://reset-password",
    })
    return { error: error ? `⚠️ ${error.message}` : null }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ? `⚠️ ${error.message}` : null }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, person, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
