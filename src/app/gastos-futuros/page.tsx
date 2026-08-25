"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  createFutureExpense,
  updateFutureExpense,
  deleteFutureExpense,
  completeFutureExpense,
  getFutureExpensesDashboard,
  getFutureExpenseCategories,
  createFutureExpenseCategory,
  updateFutureExpenseCategory,
  deleteFutureExpenseCategory,
  getPeople,
  getSavings,
} from "@/lib/db"
import type { FutureExpense, FutureExpenseCategory, Person, Saving } from "@/types"
import { Plus, Trash2, Pencil, Crosshair, CheckCircle2, ChevronDown, ChevronRight, List, Search, Link } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { friendlyError } from "@/lib/errors"
import { useCashflowFilter } from "@/components/contexts/CashflowFilterContext"
import { useHeaderActions } from "@/components/HeaderActionsContext"
import { Tooltip } from "@/components/ui/tooltip"

function getUrgencyClass(expectedDate: string): string {
  const now = new Date()
  const d = new Date(expectedDate)
  const diff = d.getTime() - now.getTime()
  const days = diff / (1000 * 60 * 60 * 24)
  if (days < 0) return "border-gray-300 opacity-60"
  if (days <= 30) return "border-red-300 bg-red-50/50 dark:bg-red-950/20"
  if (days <= 90) return "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20"
  return "border-green-300 bg-green-50/50 dark:bg-green-950/20"
}

function getUrgencyDot(expectedDate: string): string {
  const now = new Date()
  const d = new Date(expectedDate)
  const diff = d.getTime() - now.getTime()
  const days = diff / (1000 * 60 * 60 * 24)
  if (days < 0) return "bg-gray-400"
  if (days <= 30) return "bg-red-500"
  if (days <= 90) return "bg-yellow-500"
  return "bg-green-500"
}

export default function GastosFuturosPage() {
  const [expenses, setExpenses] = useState<(FutureExpense & { future_expense_categories: Pick<FutureExpenseCategory, "name"> | null; savings: Pick<import("@/types").Saving, "current_amount"> | null })[]>([])
  const [categories, setCategories] = useState<FutureExpenseCategory[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [dashboard, setDashboard] = useState<{
    totalPrevisto: number
    numPendientes: number
    next30: number
    next90: number
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FutureExpense | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const { t, fmt } = useLanguage()
  const dict = t.gastosFuturos
  const { startDate, endDate } = useCashflowFilter()

  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    let result = expenses
    if (startDate && endDate) {
      result = result.filter((e) => e.expected_date >= startDate && e.expected_date <= endDate)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((e) => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q) || (e.future_expense_categories?.name ?? "").toLowerCase().includes(q))
    }
    return result
  }, [expenses, search, startDate, endDate])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [savingId, setSavingId] = useState("")
  const [savings, setSavings] = useState<(Saving & { saving_categories: Pick<import("@/types").SavingCategory, "name"> | null })[]>([])

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<FutureExpenseCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)

  const [planCuota, setPlanCuota] = useState("")

  const [completeFor, setCompleteFor] = useState<(FutureExpense & { savings: Pick<import("@/types").Saving, "current_amount"> | null }) | null>(null)
  const [completePersonId, setCompletePersonId] = useState("")
  const [completeError, setCompleteError] = useState("")

  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false)
  const headerDropdownRef = useRef<HTMLDivElement>(null)
  const { setActions } = useHeaderActions()

  const openNew = () => {
    setEditing(null)
    setTitle("")
    setDescription("")
    setCategoryId("")
    setExpectedAmount("")
    setExpectedDate("")
setSavingId("")
    setPlanCuota("")
    setOpen(true)
  }

  const openNewCat = () => {
    setEditingCat(null)
    setCatName("")
    setOpenCat(true)
  }

  useEffect(() => {
    setActions(
      <div className="relative" ref={headerDropdownRef}>
        <button
          onClick={() => setHeaderDropdownOpen((v) => !v)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2"
        >
          <Plus className="size-4" />
          Nuevo
          <ChevronDown className={`size-3.5 transition-transform ${headerDropdownOpen ? "rotate-180" : ""}`} />
        </button>
        {headerDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setHeaderDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 overflow-hidden">
              <button
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                onClick={() => { openNewCat(); setHeaderDropdownOpen(false) }}
              >
                <List className="size-4 text-emerald-500" />
Nueva categoría
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                onClick={() => { openNew(); setHeaderDropdownOpen(false) }}
              >
                <Crosshair className="size-4 text-emerald-500" />
                Nuevo gasto futuro
              </button>
            </div>
          </>
        )}
      </div>
    )
    return () => setActions(null)
  }, [headerDropdownOpen, setActions])

  const getAllExpenses = useCallback(async () => {
    const { data } = await (await import("@/lib/supabase")).supabase
      .from("future_expenses")
      .select("*, future_expense_categories(name), savings(current_amount)")
      .order("expected_date", { ascending: true })
    return (data ?? []) as (FutureExpense & { future_expense_categories: Pick<FutureExpenseCategory, "name"> | null; savings: Pick<import("@/types").Saving, "current_amount"> | null })[]
  }, [])

  const load = useCallback(async () => {
    try {
      const [e, cats, dash, p, sav] = await Promise.all([getAllExpenses(), getFutureExpenseCategories(), getFutureExpensesDashboard(), getPeople(), getSavings()])
      setExpenses(e)
      setCategories(cats)
      setPeople(p)
      setSavings(sav)
      const { totalPrevisto, numPendientes, next30, next90 } = dash
      setDashboard({ totalPrevisto, numPendientes, next30: next30.length, next90: next90.length })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }, [getAllExpenses])

  useEffect(() => { void (async () => { await load() })() }, [load])

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string | null; name: string; items: typeof expenses }>()
    for (const c of categories) {
      map.set(c.id, { id: c.id, name: c.name, items: [] })
    }
    for (const e of filtered) {
      const catId = e.category_id ?? "__none__"
      const catName = e.future_expense_categories?.name || "Sin categoría"
      if (!map.has(catId)) map.set(catId, { id: e.category_id, name: catName, items: [] })
      map.get(catId)!.items.push(e)
    }
    return map
  }, [filtered, categories])

  const openEdit = (fe: FutureExpense) => {
    setEditing(fe)
    setTitle(fe.title)
    setDescription(fe.description)
    setCategoryId(fe.category_id ?? "")
    setExpectedAmount(String(fe.expected_amount))
setExpectedDate(fe.expected_date)
    setSavingId(fe.saving_id ?? "")
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !expectedAmount || !expectedDate) return
    setSubmitting(true)
    try {
      const catName = categories.find((c) => c.id === categoryId)?.name ?? ""
      const data = {
        title,
        description,
        category: catName,
        category_id: categoryId || null,
        expected_amount: parseFloat(expectedAmount),
        expected_date: expectedDate,
        saving_id: savingId || null,
      }
      if (editing) {
        await updateFutureExpense(editing.id, data)
      } else {
        await createFutureExpense(data)
      }
      setOpen(false)
      setEditing(null)
      setTitle("")
      setDescription("")
      setCategoryId("")
      setExpectedAmount("")
      setExpectedDate("")
      setSavingId("")
      setPlanCuota("")
      setSuccessMsg(true)
      setTimeout(() => setSuccessMsg(false), 3000)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(dict.deleteConfirm)) return
    setSubmitting(true)
    try {
      await deleteFutureExpense(id)
      setSuccessMsg(true)
      setTimeout(() => setSuccessMsg(false), 3000)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkCompleted = async (id: string) => {
    const fe = expenses.find((e) => e.id === id)
    if (!fe) return
    const balance = Number(fe.savings?.current_amount ?? 0)
    const target = Number(fe.expected_amount ?? 0)
    if (balance < target) {
      setError(`El objetivo aún no está completo: llevas ${fmt(balance)} de ${fmt(target)} en su hucha.`)
      return
    }
    setCompleteFor(fe)
    setCompletePersonId(people[0]?.id ?? "")
    setCompleteError("")
  }

  const handleCompleteConfirm = async () => {
    if (!completeFor) return
    if (!completePersonId) { setCompleteError("Selecciona una persona."); return }
    setSubmitting(true)
    try {
      await completeFutureExpense(completeFor.id, completePersonId)
      setCompleteFor(null)
      setSuccessMsg(true)
      setTimeout(() => setSuccessMsg(false), 3000)
      load()
    } catch (err) {
      setCompleteError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const openEditCat = (cat: FutureExpenseCategory) => {
    setEditingCat(cat)
    setCatName(cat.name)
    setOpenCat(true)
  }

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return
    setSubmitting(true)
    try {
      if (editingCat) {
        await updateFutureExpenseCategory(editingCat.id, { name: catName.trim() })
      } else {
        await createFutureExpenseCategory({ name: catName.trim() })
      }
      setOpenCat(false)
      setEditingCat(null)
      setSuccessMsg(true)
      setTimeout(() => setSuccessMsg(false), 3000)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const catDeleteExpenses = catToDelete
    ? expenses.filter((e) => e.category_id === catToDelete.id)
    : []

  const handleDeleteCat = (id: string) => {
    const cat = categories.find((c) => c.id === id)
    if (cat) setCatToDelete({ id: cat.id, name: cat.name })
  }

  const confirmDeleteCat = async () => {
    if (!catToDelete) return
    setSubmitting(true)
    try {
      const ids = catDeleteExpenses.map((e) => e.id)
      await Promise.all(ids.map((id) => deleteFutureExpense(id)))
      await deleteFutureExpenseCategory(catToDelete.id)
      setCatToDelete(null)
      setSuccessMsg(true)
      setTimeout(() => setSuccessMsg(false), 3000)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const planCalc = useMemo(() => {
    if (!expectedAmount) return null
    const target = parseFloat(expectedAmount)
    if (!target) return null
    if (expectedDate) {
      const now = new Date()
      const end = new Date(expectedDate)
      const diff = end.getTime() - now.getTime()
      if (diff <= 0) return null
      const months = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30.44)))
      return { cuota: fmt(target / months), meses: months, type: "fecha" as const }
    }
    if (planCuota) {
      const cuota = parseFloat(planCuota)
      if (!cuota) return null
      const meses = Math.ceil(target / cuota)
      const end = new Date()
      end.setMonth(end.getMonth() + meses)
      return { meses, type: "cuota" as const, fechaEst: end.toLocaleDateString("es-DO") }
    }
    return null
  }, [expectedAmount, expectedDate, planCuota, fmt])

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const hasItems = expenses.length > 0 || categories.length > 0
  const allExpanded = [...grouped.keys()].length > 0 && [...grouped.keys()].every((k) => expandedCats.has(k))

  return (
    <div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}
      <Dialog open={openCat} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCat(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
<DialogTitle>{editingCat ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Las categorías organizan tus gastos futuros.</p>
          </DialogHeader>
          <form onSubmit={handleCatSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-sm font-medium text-slate-700">Nombre</Label>
                <Input id="catName" value={catName} onChange={(e) => setCatName(e.target.value)} required />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : editingCat ? "Guardar cambios" : "Crear categoría"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!catToDelete} onOpenChange={(v) => { if (!v) setCatToDelete(null) }}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar categoría</DialogTitle>
          <p className="text-xs text-slate-500 mt-1">Esta acción no se puede deshacer.</p>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-rose-50 rounded-lg p-4 text-sm text-rose-700">
            <p>
              ¿Eliminar la categoría <strong>{catToDelete?.name}</strong>?
            </p>
            {catDeleteExpenses.length > 0 && (
              <p className="mt-1 text-xs text-rose-500">Los siguientes gastos también serán eliminados:</p>
            )}
            {catDeleteExpenses.length === 0 && (
              <p className="mt-1 text-xs text-rose-400">No hay gastos asociados.</p>
            )}
          </div>
          {catDeleteExpenses.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-2">
              {catDeleteExpenses.map((fe) => (
                <div key={fe.id} className="flex items-center justify-between text-sm px-3 py-1.5 rounded hover:bg-slate-50">
                  <span className="text-slate-700">{fe.title}</span>
                  <span className="font-semibold text-rose-600 tabular-nums">{fmt(Number(fe.expected_amount))}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
            <Button variant="destructive" onClick={confirmDeleteCat} disabled={submitting}>
              {submitting ? "Eliminando..." : `Eliminar ${catDeleteExpenses.length > 0 ? `(${catDeleteExpenses.length} gastos)` : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>
      <Dialog key={editing?.id ?? 'new'} open={open} onOpenChange={(v) => { if (!v) setEditing(null); setOpen(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? dict.editTitle : dict.newTitle}</DialogTitle>
          <p className="text-xs text-slate-500 mt-1">Planificá un gasto futuro y calculá tu ahorro.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-medium text-slate-700">{dict.titleLabel}</Label>
              <Input id="title" placeholder={dict.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium text-slate-700">{dict.descripcion}</Label>
              <Input id="description" placeholder={dict.descripcionPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="catSelect" className="text-sm font-medium text-slate-700">{dict.categoria}</Label>
                <select
                  id="catSelect"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                >
                  <option value="">— Sin categoría —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-sm font-medium text-slate-700">{dict.fecha}</Label>
                <Input id="date" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-sm font-medium text-slate-700">{dict.monto}</Label>
              <Input id="amount" type="number" step="0.01" min="0.01" placeholder={dict.montoPlaceholder} value={expectedAmount} onChange={(e) => setExpectedAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="savingSelect" className="text-sm font-medium text-slate-700">Hucha vinculada</Label>
              <select
                id="savingSelect"
                value={savingId}
                onChange={(e) => setSavingId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              >
                <option value="">— Sin hucha —</option>
                {savings.filter((s) => !s.saving_categories?.name || s.saving_categories.name !== "Gastos futuros").map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.saving_categories?.name ? ` · ${s.saving_categories.name}` : ""}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">Solo podés vincular huchas que ya creaste en la vista Hucha.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="planCuota" className="text-sm font-medium text-slate-700">Ahorro mensual (opcional)</Label>
              <Input id="planCuota" type="number" step="0.01" min="0.01" placeholder="0.00" value={planCuota} onChange={(e) => setPlanCuota(e.target.value)} />
            </div>
            {planCalc && (
              <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 text-sm text-amber-800">
                {planCalc.type === "fecha" ? (
                  <p>Necesitas ahorrar <strong>{planCalc.cuota}</strong> por mes durante <strong>{planCalc.meses} meses</strong></p>
                ) : (
                  <p>Ahorrando <strong>{fmt(parseFloat(planCuota || "0"))}</strong> por mes, alcanzas la meta en <strong>{planCalc.meses} meses</strong> (~{planCalc.fechaEst})</p>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
            <Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : editing ? dict.guardarCambios : dict.guardar}</Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>

      <Dialog key={completeFor?.id ?? 'complete'} open={!!completeFor} onOpenChange={(v) => { if (!v) setCompleteFor(null) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Completar objetivo</DialogTitle>
          <p className="text-xs text-slate-500 mt-1">El dinero saldrá de la hucha de esta meta hacia el disponible.</p>
        </DialogHeader>
        <div className="space-y-4">
          {completeFor && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Objetivo</span>
                <span className="font-semibold text-slate-800">{completeFor.title}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Saldo en hucha</span>
                <span className="font-semibold text-emerald-600 tabular-nums">{fmt(Number(completeFor.savings?.current_amount ?? 0))}</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="completePerson" className="text-sm font-medium text-slate-700">Persona (ingreso al disponible)</Label>
                <select
                  id="completePerson"
                  value={completePersonId}
                  onChange={(e) => setCompletePersonId(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                >
                  <option value="">— Seleccionar persona —</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {completeError && <p className="text-xs text-red-600">{completeError}</p>}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setCompleteFor(null)}>Cancelar</Button>
            <Button onClick={handleCompleteConfirm} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? "Completando..." : "Completar objetivo"}
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      <div className="grid gap-2 md:grid-cols-4 mb-3">
        <Tooltip content="Suma del monto esperado de gastos futuros pendientes" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{dict.totalPrevisto}</p>
                <h3 className="text-lg font-bold text-rose-600">{fmt(dashboard?.totalPrevisto ?? 0)}</h3>
              </div>
              <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600">
                <Crosshair className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>
        <Tooltip content="Gastos futuros pendientes de pago" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{dict.pendientes}</p>
                <h3 className="text-lg font-bold text-slate-800">{dashboard?.numPendientes ?? 0}</h3>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg text-slate-600">
                <List className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>
        <Tooltip content="Gastos futuros que vencen en ≤30 días" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{dict.proximos30}</p>
                <h3 className="text-lg font-bold text-slate-800">{dashboard?.next30 ?? 0}</h3>
              </div>
              <div className="p-1.5 bg-red-50 rounded-lg text-red-600">
                <Crosshair className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>
        <Tooltip content="Gastos futuros que vencen entre 30 y 90 días" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{dict.proximos90}</p>
                <h3 className="text-lg font-bold text-slate-800">{dashboard?.next90 ?? 0}</h3>
              </div>
              <div className="p-1.5 bg-yellow-50 rounded-lg text-yellow-600">
                <Crosshair className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>
      </div>

      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 mb-4">
          {dict.successMessage}
        </div>
      )}

      <div className="relative flex-1 max-w-xs mb-3">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        />
      </div>

      {!hasItems ? (
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm text-center">
          <p className="text-xs text-slate-500">{dict.empty}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gastos por categoría</span>
            <button
              onClick={() => {
                if (allExpanded) setExpandedCats(new Set())
                else setExpandedCats(new Set([...grouped.keys()]))
              }}
              className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
            >
              {allExpanded ? "Contraer todo" : "Expandir todo"}
            </button>
          </div>
          <div>
            {Array.from(grouped.entries()).map(([key, { id: catId, name: catName, items }]) => {
              const isExpanded = expandedCats.has(key)
              const catTotal = items.reduce((s, e) => s + Number(e.expected_amount), 0)
              const cat = categories.find((c) => c.id === catId)
              return (
                <div key={key}>
                  <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <button onClick={() => setExpandedCats((prev) => {
                      const next = new Set(prev)
                      if (next.has(key)) next.delete(key)
                      else next.add(key)
                      return next
                    })} className="text-slate-400 hover:text-slate-600 mr-2">
                      {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                    {cat && (
                      <>
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 mr-0.5" onClick={() => openEditCat(cat)}>
                          <Pencil className="size-3" />
                        </button>
                        <button className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 mr-0.5" onClick={() => handleDeleteCat(cat.id)}>
                          <Trash2 className="size-3" />
                        </button>
                      </>
                    )}
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{catName}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">({items.length})</span>
                    <span className="ml-auto text-xs font-semibold text-rose-600 tabular-nums">{fmt(catTotal)}</span>
                  </div>

                  {isExpanded && items.map((fe) => (
                    <div key={fe.id} className={`flex items-center px-4 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${getUrgencyClass(fe.expected_date)}`}>
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`size-1.5 rounded-full shrink-0 ${getUrgencyDot(fe.expected_date)}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900 truncate">{fe.title}</p>
                            <p className="text-[10px] text-slate-500">{new Date(fe.expected_date).toLocaleDateString("es-CO")}{fe.status === "completed" ? ` · ${dict.statusCompleted}` : ""}</p>
                            {fe.saving_id && (() => {
                              const linkedSaving = savings.find((s) => s.id === fe.saving_id)
                              return (
                                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-indigo-600">
                                  <Link className="size-3" />
                                  <span className="truncate">Hucha: {linkedSaving?.name ?? "vinculada"}</span>
                                  {linkedSaving?.saving_categories?.name ? (
                                    <span className="text-slate-400">· {linkedSaving.saving_categories.name}</span>
                                  ) : null}
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {fe.status === "planned" && Number(fe.expected_amount) > 0 && (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 tabular-nums">Abonado {fmt(Number(fe.savings?.current_amount ?? 0))} / {fmt(Number(fe.expected_amount))}</span>
                            <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${Number(fe.savings?.current_amount ?? 0) >= Number(fe.expected_amount) ? "bg-emerald-500" : "bg-indigo-500"}`}
                                style={{ width: `${Math.min(100, (Number(fe.savings?.current_amount ?? 0) / Number(fe.expected_amount)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <span className="text-xs font-semibold text-rose-600 tabular-nums">{fmt(Number(fe.expected_amount))}</span>
                        <div className="flex items-center gap-0.5">
                          {fe.status === "planned" && (
                            <>
                              <button className="text-slate-400 hover:text-green-600 transition-colors p-0.5" title={dict.markCompleted} onClick={() => handleMarkCompleted(fe.id)}>
                                <CheckCircle2 className="size-3" />
                              </button>
                              <button className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5" onClick={() => openEdit(fe)}>
                                <Pencil className="size-3" />
                              </button>
                            </>
                          )}
                          <button className="text-slate-400 hover:text-rose-600 transition-colors p-0.5" onClick={() => handleDelete(fe.id)}>
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          <div className="bg-white px-4 py-2.5 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-rose-600 font-medium">Total: {fmt(dashboard?.totalPrevisto ?? 0)}</span>
            <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors" onClick={openNew}>
              <Plus className="size-3" /> {dict.newTitle}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

