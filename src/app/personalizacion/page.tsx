"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/i18n/useLanguage"
import { Palette, DollarSign, Key, Users, Loader2, Shield, ShieldCheck } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AllowedUser, UserRole } from "@/types"

export default function PersonalizacionPage() {
  const { t, language, setLanguage, currency, setCurrency } = useLanguage()
  const { user, isAdmin, refreshRole } = useAuth()
  const p = t.personalizacion

  return (
    <div className="max-w-xl mx-auto py-8 px-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center size-10 rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-900/30">
          <Palette className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{p.title}</h2>
          <p className="text-sm text-muted-foreground">{p.subtitle}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-2">Idioma</h3>
          <div className="space-y-2">
            <label
              className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                language === "standard"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="language"
                value="standard"
                checked={language === "standard"}
                onChange={() => setLanguage("standard")}
                className="size-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm">{p.estandar}</p>
                <p className="text-xs text-muted-foreground">{p.standardDesc}</p>
              </div>
            </label>

            <label
              className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                language === "kellycaribe"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="language"
                value="kellycaribe"
                checked={language === "kellycaribe"}
                onChange={() => setLanguage("kellycaribe")}
                className="size-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm">{p.kellycaribe}</p>
                <p className="text-xs text-muted-foreground">{p.caribeDesc}</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="size-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">{p.moneda}</h3>
          </div>
          <div className="space-y-2">
            <label
              className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                currency === "COP"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="COP"
                checked={currency === "COP"}
                onChange={() => setCurrency("COP")}
                className="size-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm">{p.copDesc}</p>
                <p className="text-xs text-muted-foreground">$1.234,56</p>
              </div>
            </label>

            <label
              className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                currency === "EUR"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="EUR"
                checked={currency === "EUR"}
                onChange={() => setCurrency("EUR")}
                className="size-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm">{p.eurDesc}</p>
                <p className="text-xs text-muted-foreground">1.234,56 €</p>
              </div>
            </label>
          </div>
        </div>

        <SecuritySection />
        {isAdmin && <UserManagementSection />}
      </div>
    </div>
  )
}

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setError("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("⚠️ Completa todos los campos.")
      return
    }

    if (newPassword.length < 8) {
      setError("⚠️ La contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("⚠️ Las contraseñas no coinciden.")
      return
    }

    setBusy(true)

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email ?? "",
      password: currentPassword,
    })

    if (signInErr) {
      setError("⚠️ Contraseña actual incorrecta.")
      setBusy(false)
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
    setBusy(false)

    if (updateErr) {
      setError("⚠️ Epa, algo salió mal.")
      return
    }

    setMessage("✅ Clave actualizada correctamente.")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Key className="size-4 text-yellow-500" />
        <h3 className="text-sm font-semibold">🔑 Seguridad</h3>
      </div>
      <form onSubmit={handleChangePassword} className="space-y-3 rounded-xl border p-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Contraseña actual</Label>
          <Input
            id="currentPassword"
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">Contraseña nueva</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña nueva</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
          Cambiar contraseña
        </Button>
      </form>
    </div>
  )
}

function UserManagementSection() {
  const [allowedUsers, setAllowedUsers] = useState<(AllowedUser & { role?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<AllowedUser | null>(null)

  const loadUsers = async () => {
    const { data: users } = await supabase.from("allowed_users").select("*").order("created_at", { ascending: true })
    if (users) {
      const withRoles = await Promise.all(
        users.map(async (u) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", u.id)
            .maybeSingle()
          return { ...u, role: roleData?.role as string | undefined }
        })
      )
      setAllowedUsers(withRoles)
    }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setError("")
    if (!newEmail.trim()) return

    setBusy(true)
    const { error: insertErr } = await supabase
      .from("allowed_users")
      .insert({ email: newEmail.trim().toLowerCase(), active: true })
    setBusy(false)

    if (insertErr) {
      setError("⚠️ Epa, algo salió mal. El correo podría ya existir.")
      return
    }
    setMessage("✅ Usuario autorizado agregado.")
    setNewEmail("")
    loadUsers()
  }

  const toggleActive = async (u: AllowedUser & { role?: string }) => {
    setError("")
    const adminCount = allowedUsers.filter(a => a.role === "admin" && a.active).length
    if (u.active && adminCount <= 1 && u.role === "admin") {
      setError("⚠️ No puedes desactivar el último administrador.")
      return
    }
    await supabase.from("allowed_users").update({ active: !u.active }).eq("id", u.id)
    loadUsers()
  }

  const changeRole = async (u: AllowedUser & { role?: string }, newRole: string) => {
    const adminCount = allowedUsers.filter(a => a.role === "admin" && a.active).length
    if (u.role === "admin" && newRole === "user" && adminCount <= 1) {
      setError("⚠️ No puedes convertir al último administrador en usuario.")
      return
    }
    setError("")
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", u.id)
      .maybeSingle()
    if (existingRole) {
      await supabase.from("user_roles").update({ role: newRole }).eq("user_id", u.id)
    } else {
      await supabase.from("user_roles").insert({ user_id: u.id, role: newRole })
    }
    loadUsers()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const adminCount = allowedUsers.filter(a => a.role === "admin" && a.active).length
    if ((deleteTarget as AllowedUser & { role?: string }).role === "admin" && adminCount <= 1) {
      setError("⚠️ No puedes eliminar al último administrador.")
      setDeleteTarget(null)
      return
    }
    await supabase.from("allowed_users").delete().eq("id", deleteTarget.id)
    setDeleteTarget(null)
    loadUsers()
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Users className="size-4 text-blue-500" />
        <h3 className="text-sm font-semibold">👥 Usuarios Autorizados</h3>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-3">
        <Input
          type="email"
          placeholder="correo@ejemplo.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
        />
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Autorizar"}
        </Button>
      </form>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 mb-3">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-3">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {allowedUsers.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay usuarios autorizados.</p>
        )}
        {allowedUsers.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-xl border p-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`size-2 rounded-full shrink-0 ${u.active ? "bg-green-500" : "bg-red-400"}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{u.email}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{u.role === "admin" ? "Administrador" : "Usuario"}</span>
                  <span>·</span>
                  <span>{u.active ? "Activo" : "Inactivo"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={u.role ?? "user"}
                onChange={(e) => changeRole(u, e.target.value)}
                className="h-7 text-xs rounded-md border border-input bg-transparent px-2"
              >
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => toggleActive(u)}
                className="p-1.5 rounded hover:bg-muted/50 text-xs"
                title={u.active ? "Desactivar" : "Activar"}
              >
                {u.active ? <ShieldCheck className="size-3.5 text-green-500" /> : <Shield className="size-3.5 text-muted-foreground" />}
              </button>
              <button
                onClick={() => setDeleteTarget(u)}
                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-xs text-muted-foreground hover:text-red-500"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar usuario autorizado</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Eliminar a <strong>{deleteTarget?.email}</strong> de la lista de usuarios autorizados?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
