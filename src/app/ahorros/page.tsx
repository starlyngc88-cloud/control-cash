"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
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
  getSavings,
  createSaving,
  updateSaving,
  deleteSaving,
  createSavingMovement,
  getSavingsDashboard,
  getSavingCategories,
  createSavingCategory,
  updateSavingCategory,
  deleteSavingCategory,
  getPeople,
  getBudgetCategoriesForMonth,
  createExpense,
  createIncome,
  getFutureExpenses,
  completeFutureExpenseBySaving,
} from "@/lib/db"
import type { Saving, SavingMovement, SavingCategory, Person, BudgetCategory, BudgetTemplate, FutureExpense } from "@/types"
import { Plus, Trash2, Pencil, Goal, ArrowDownCircle, ArrowUpCircle, List, ChevronDown, ChevronRight, PiggyBank, Search, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { friendlyError } from "@/lib/errors"
import { useHeaderActions } from "@/components/HeaderActionsContext"
import { useMonthFilter } from "@/components/MonthFilterContext"
import { Tooltip } from "@/components/ui/tooltip"

export default function AhorrosPage() {
  const [savings, setSavings] = useState<(Saving & { saving_categories: Pick<SavingCategory, "name"> | null })[]>([])
  const [categories, setCategories] = useState<SavingCategory[]>([])
  const [dashboard, setDashboard] = useState<{
    totalAhorrado: number
    numHuchas: number
    recentMovements: (SavingMovement & { savings: Pick<Saving, "name"> })[]
  } | null>(null)
  const [openSaving, setOpenSaving] = useState(false)
  const [openMovement, setOpenMovement] = useState(false)
  const [movementSavingId, setMovementSavingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Saving | null>(null)
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const { t, fmt } = useLanguage()
  const dict = t.ahorros

  const { months } = useMonthFilter()
  const sorted = [...months].sort()
  const activeMonth = sorted[0] ?? ""

  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search) return savings
    const q = search.toLowerCase()
    return savings.filter((s) => s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q) || (s.saving_categories?.name ?? "").toLowerCase().includes(q))
  }, [savings, search])

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [savingCategoryId, setSavingCategoryId] = useState("")
  const [movType, setMovType] = useState<"income" | "withdrawal">("income")
  const [movAmount, setMovAmount] = useState("")
  const [movNotes, setMovNotes] = useState("")
  const [movDate, setMovDate] = useState(new Date().toISOString().split("T")[0])
  const [movPersonId, setMovPersonId] = useState("")
  const [movOrigin, setMovOrigin] = useState<"rubro" | "disponible">("disponible")
  const [movBudgetCategoryId, setMovBudgetCategoryId] = useState("")

  const [people, setPeople] = useState<Person[]>([])
  const [budgetCategories, setBudgetCategories] = useState<(BudgetCategory & { budget_templates: Pick<BudgetTemplate, "name"> })[]>([])
  const [linkedFuture, setLinkedFuture] = useState<(FutureExpense & { savings: Pick<Saving, "current_amount"> | null })[]>([])
  const [completeSavingId, setCompleteSavingId] = useState<string | null>(null)
  const [completePersonId, setCompletePersonId] = useState("")

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<SavingCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)

  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false)
  const headerDropdownRef = useRef<HTMLDivElement>(null)
  const { setActions } = useHeaderActions()

  const openNewSaving = () => {
    setEditing(null)
    setName("")
    setDescription("")
    setSavingCategoryId("")
    setOpenSaving(true)
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
                onClick={() => { openNewSaving(); setHeaderDropdownOpen(false) }}
              >
                <PiggyBank className="size-4 text-emerald-500" />
                Nueva hucha
              </button>
            </div>
          </>
        )}
      </div>
    )
    return () => setActions(null)
  }, [headerDropdownOpen, setActions])

  const load = useCallback(async () => {
    try {
      const [s, d, cats, p, bCats, f] = await Promise.all([
        getSavings(),
        getSavingsDashboard(),
        getSavingCategories(),
        getPeople(),
        activeMonth ? getBudgetCategoriesForMonth(activeMonth) : Promise.resolve([]),
        getFutureExpenses(),
      ])
      setSavings(s)
      setDashboard(d)
      setCategories(cats)
      setPeople(p)
      setBudgetCategories(bCats)
      setLinkedFuture(f)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }, [activeMonth])

  useEffect(() => { void (async () => { await load() })() }, [load])

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string | null; name: string; items: (Saving & { saving_categories: Pick<SavingCategory, "name"> | null })[] }>()
    for (const c of categories) {
      if (c.name === "Gastos futuros") continue
      map.set(c.id, { id: c.id, name: c.name, items: [] })
    }
    for (const s of filtered) {
      if (linkedFuture.some((f) => f.saving_id === s.id)) continue
      const catId = s.category_id ?? "__none__"
      const catName = s.saving_categories?.name || "Sin categoría"
      if (!map.has(catId)) map.set(catId, { id: s.category_id, name: catName, items: [] })
      map.get(catId)!.items.push(s)
    }
    return map
  }, [filtered, categories, linkedFuture])

  const openEditSaving = (s: Saving) => {
    setEditing(s)
    setName(s.name)
    setDescription(s.description)
    setSavingCategoryId(s.category_id ?? "")
    setOpenSaving(true)
  }

  const handleSavingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setSubmitting(true)
    try {
      const data = {
        name,
        description,
        category_id: savingCategoryId || null,
      }
      if (editing) {
        await updateSaving(editing.id, data)
      } else {
        await createSaving(data)
      }
      setOpenSaving(false)
      setEditing(null)
      setName("")
      setDescription("")
      setSavingCategoryId("")
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSaving = async (id: string) => {
    if (!confirm(dict.deleteConfirm)) return
    setSubmitting(true)
    try {
      await deleteSaving(id)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const openNewMovement = (savingId: string, type: "income" | "withdrawal" = "income") => {
    setMovementSavingId(savingId)
    setMovType(type)
    setMovAmount("")
    setMovNotes("")
    setMovDate(new Date().toISOString().split("T")[0])
    setMovPersonId("")
    setMovOrigin("disponible")
    setMovBudgetCategoryId("")
    setOpenMovement(true)
  }

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movementSavingId || !movAmount) return
    if (!movPersonId) return
    if (movType === "income" && movOrigin === "rubro" && !movBudgetCategoryId) return
    setSubmitting(true)
    try {
      const amount = parseFloat(movAmount)
      if (movType === "income") {
        const expense = await createExpense({
          person_id: movPersonId,
          amount,
          description: movNotes,
          date: movDate,
          expense_category_id: null,
          budget_category_id: movOrigin === "rubro" ? movBudgetCategoryId : null,
          saving_id: null,
        })
        await createSavingMovement({
          saving_id: movementSavingId,
          type: "income",
          amount,
          notes: movNotes,
          movement_date: movDate,
          expense_id: expense.id,
        })
      } else {
        await createIncome({
          person_id: movPersonId,
          amount,
          description: movNotes,
          date: movDate,
          category_id: null,
        })
        await createSavingMovement({
          saving_id: movementSavingId,
          type: "withdrawal",
          amount,
          notes: movNotes,
          movement_date: movDate,
        })
      }
      setOpenMovement(false)
      setMovementSavingId(null)
      setSuccessMsg(true)
      setTimeout(() => setSuccessMsg(false), 3000)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const openEditCat = (cat: SavingCategory) => {
    setEditingCat(cat)
    setCatName(cat.name)
    setOpenCat(true)
  }

  const openCompleteFromSaving = (savingId: string) => {
    setCompleteSavingId(savingId)
    setCompletePersonId(people[0]?.id ?? "")
    setError("")
  }

  const handleCompleteFromSaving = async () => {
    if (!completeSavingId || !completePersonId) return
    setSubmitting(true)
    try {
      await completeFutureExpenseBySaving(completeSavingId, completePersonId)
      setCompleteSavingId(null)
      setSuccessMsg(true)
      setTimeout(() => setSuccessMsg(false), 3000)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return
    setSubmitting(true)
    try {
      if (editingCat) {
        await updateSavingCategory(editingCat.id, { name: catName.trim() })
      } else {
        await createSavingCategory({ name: catName.trim() })
      }
      setOpenCat(false)
      setEditingCat(null)
      setCatName("")
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const catDeleteExpenses = catToDelete
    ? savings.filter((s) => s.category_id === catToDelete.id)
    : []

  const handleDeleteCat = (id: string) => {
    const cat = categories.find((c) => c.id === id)
    if (cat) setCatToDelete({ id: cat.id, name: cat.name })
  }

  const confirmDeleteCat = async () => {
    if (!catToDelete) return
    setSubmitting(true)
    try {
      const ids = savings.filter((s) => s.category_id === catToDelete.id).map((s) => s.id)
      await Promise.all(ids.map((id) => deleteSaving(id)))
      await deleteSavingCategory(catToDelete.id)
      setCatToDelete(null)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const regularSavings = savings.filter((s) => !linkedFuture.some((f) => f.saving_id === s.id))
  const totalAhorrado = regularSavings.reduce((sum, s) => sum + Number(s.current_amount), 0)
  const numHuchas = regularSavings.length
  const recentMovements = dashboard?.recentMovements ?? []
  const hasItems = regularSavings.length > 0 || categories.some((c) => c.name !== "Gastos futuros")

  const allExpanded = [...grouped.keys()].length > 0 && [...grouped.keys()].every((k) => expandedCats.has(k))

  const renderSavingRow = (s: Saving & { saving_categories: Pick<SavingCategory, "name"> | null }) => {
    const linkedFe = linkedFuture.find((f) => f.saving_id === s.id && f.status === "planned")
    const completedFe = linkedFuture.find((f) => f.saving_id === s.id && f.status === "completed")
    const canComplete = linkedFe && Number(s.current_amount) >= Number(linkedFe.expected_amount)
    return (
      <div key={s.id} className="flex items-center px-4 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
        <div className="flex items-center flex-1 min-w-0">
          <div className="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
            <PiggyBank className="size-3" />
          </div>
          <div className="ml-2.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-slate-900 truncate">{s.name}</p>
              {linkedFe && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">Gasto futuro</span>}
              {completedFe && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Completado</span>}
            </div>
            {linkedFe && (
              <p className="text-[10px] text-slate-500 tabular-nums">
                Meta {fmt(Number(linkedFe.expected_amount))} · {fmt(Number(s.current_amount))} abonados
              </p>
            )}
            {s.description && !linkedFe && <p className="text-[10px] text-slate-500">{s.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className="text-xs font-semibold text-emerald-600 tabular-nums">{fmt(Number(s.current_amount))}</span>
          <div className="flex items-center gap-0.5">
            {canComplete && (
              <button className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5" title="Completar objetivo" onClick={() => openCompleteFromSaving(s.id)}>
                <CheckCircle2 className="size-3" />
              </button>
            )}
            <button className="text-slate-400 hover:text-green-600 transition-colors p-0.5" title={dict.addMoney} onClick={() => openNewMovement(s.id, "income")}>
              <ArrowDownCircle className="size-3" />
            </button>
            <button className="text-slate-400 hover:text-rose-600 transition-colors p-0.5" title={dict.withdrawMoney} onClick={() => openNewMovement(s.id, "withdrawal")}>
              <ArrowUpCircle className="size-3" />
            </button>
            <button className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5" onClick={() => openEditSaving(s)}>
              <Pencil className="size-3" />
            </button>
            <button className="text-slate-400 hover:text-rose-600 transition-colors p-0.5" onClick={() => handleDeleteSaving(s.id)}>
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}
      <Dialog open={openCat} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCat(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Las categorías agrupan tus metas de ahorro.</p>
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
              <p className="mt-1 text-xs text-rose-500">Las siguientes huchas también serán eliminadas:</p>
            )}
            {catDeleteExpenses.length === 0 && (
              <p className="mt-1 text-xs text-rose-400">No hay huchas asociadas.</p>
            )}
          </div>
          {catDeleteExpenses.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-2">
              {catDeleteExpenses.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm px-3 py-1.5 rounded hover:bg-slate-50">
                  <span className="text-slate-700">{s.name}</span>
                  <span className="font-semibold text-rose-600 tabular-nums">{fmt(Number(s.current_amount))}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
            <Button variant="destructive" onClick={confirmDeleteCat} disabled={submitting}>
              {submitting ? "Eliminando..." : `Eliminar ${catDeleteExpenses.length > 0 ? `(${catDeleteExpenses.length} huchas)` : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>
      <Dialog key={editing?.id ?? 'new'} open={openSaving} onOpenChange={(v) => { if (!v) setEditing(null); setOpenSaving(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? dict.editTitle : dict.newTitle}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Creá una nueva meta de ahorro.</p>
          </DialogHeader>
          <form onSubmit={handleSavingSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">{dict.nombre}</Label>
                <Input id="name" placeholder={dict.nombrePlaceholder} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">{dict.descripcion}</Label>
                <Input id="description" placeholder={dict.descripcionPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="catSelect" className="text-sm font-medium text-slate-700">Categoría</Label>
                <select
                  id="catSelect"
                  value={savingCategoryId}
                  onChange={(e) => setSavingCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                >
                  <option value="">— Sin categoría —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : editing ? dict.guardarCambios : dict.guardar}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-2 md:grid-cols-3 mb-3">
        <Tooltip content="Suma del saldo actual de todas las huchas" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{dict.totalAhorrado}</p>
                <h3 className="text-lg font-bold text-emerald-600">{fmt(totalAhorrado)}</h3>
              </div>
              <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                <Goal className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>
        <Tooltip content="Cantidad de metas de ahorro (huchas) creadas" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{dict.numHuchas}</p>
                <h3 className="text-lg font-bold text-slate-800">{numHuchas}</h3>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg text-slate-600">
                <PiggyBank className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>
        <Tooltip content="Cantidad de movimientos recientes de ahorro" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Movimientos</p>
                <h3 className="text-lg font-bold text-slate-800">{recentMovements.length}</h3>
              </div>
              <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
                <ArrowDownCircle className="size-3.5" />
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Huchas por categoría</span>
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
              const catTotal = items.reduce((s, e) => s + Number(e.current_amount), 0)
              const cat = categories.find((c) => c.id === catId)
              return (
                <div key={key}>
                  <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <button onClick={() => setExpandedCats((prev) => {
                      const next = new Set(prev)
                      if (next.has(key)) next.delete(key)
                      else next.add(key)
                      return next
                    })} className="text-slate-400 hover:text-slate-600 mr-1.5">
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
                    <span className="ml-auto text-xs font-semibold text-emerald-600 tabular-nums">{fmt(catTotal)}</span>
                  </div>

                  {isExpanded && items.map((s) => renderSavingRow(s))}
                </div>
              )
            })}
          </div>
          <div className="bg-white px-4 py-2.5 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-emerald-600 font-medium">Total: {fmt(totalAhorrado)}</span>
            <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors" onClick={openNewSaving}>
              <Plus className="size-3" /> {dict.newHucha}
            </button>
          </div>
        </div>
      )}

      <Dialog open={!!completeSavingId} onOpenChange={(v) => { if (!v) setCompleteSavingId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Completar objetivo de gasto futuro</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">El dinero saldrá de esta hucha hacia el disponible.</p>
          </DialogHeader>
          <div className="space-y-4">
            {completeSavingId && (() => {
              const saving = savings.find((s) => s.id === completeSavingId)
              const fe = linkedFuture.find((f) => f.saving_id === completeSavingId)
              return (
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Hucha</span>
                    <span className="font-semibold text-slate-800">{saving?.name}</span>
                  </div>
                  {fe && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Saldo en hucha</span>
                        <span className="font-semibold text-emerald-600 tabular-nums">{fmt(Number(saving?.current_amount ?? 0))}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Meta</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{fmt(Number(fe.expected_amount))}</span>
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="completePersonSaving" className="text-sm font-medium text-slate-700">Persona (ingreso al disponible)</Label>
                    <select
                      id="completePersonSaving"
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
                </div>
              )
            })()}
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setCompleteSavingId(null)}>Cancelar</Button>
              <Button onClick={handleCompleteFromSaving} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                {submitting ? "Completando..." : "Completar objetivo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openMovement} onOpenChange={(v) => { if (!v) setMovementSavingId(null); setOpenMovement(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dict.movementTitle}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Registrá un ingreso o retiro de la hucha.</p>
          </DialogHeader>
          <form onSubmit={handleMovementSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="movPerson" className="text-sm font-medium text-slate-700">{dict.persona}</Label>
                <select
                  id="movPerson"
                  value={movPersonId}
                  onChange={(e) => setMovPersonId(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                >
                  <option value="">{dict.personaPlaceholder}</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">{dict.movementType}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={movType === "income" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setMovType("income")}
                  >
                    <ArrowDownCircle className="size-4 mr-2" />
                    {dict.ingreso}
                  </Button>
                  <Button
                    type="button"
                    variant={movType === "withdrawal" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setMovType("withdrawal")}
                  >
                    <ArrowUpCircle className="size-4 mr-2" />
                    {dict.retirada}
                  </Button>
                </div>
              </div>
              {movType === "income" && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">{dict.origen}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={movOrigin === "disponible" ? "default" : "outline"}
                      className="flex-1 text-xs"
                      onClick={() => { setMovOrigin("disponible"); setMovBudgetCategoryId("") }}
                    >
                      {dict.origenDisponible}
                    </Button>
                    <Button
                      type="button"
                      variant={movOrigin === "rubro" ? "default" : "outline"}
                      className="flex-1 text-xs"
                      onClick={() => setMovOrigin("rubro")}
                    >
                      {dict.origenRubro}
                    </Button>
                  </div>
                  {movOrigin === "rubro" && (
                    <select
                      value={movBudgetCategoryId}
                      onChange={(e) => setMovBudgetCategoryId(e.target.value)}
                      required
                      className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                    >
                      <option value="">{dict.rubroPlaceholder}</option>
                      {budgetCategories.map((bc) => (
                        <option key={bc.id} value={bc.id}>{bc.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="movAmount" className="text-sm font-medium text-slate-700">{dict.monto}</Label>
                <Input id="movAmount" type="number" step="0.01" min="0.01" placeholder={dict.montoPlaceholder} value={movAmount} onChange={(e) => setMovAmount(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="movNotes" className="text-sm font-medium text-slate-700">{dict.notas}</Label>
                <Input id="movNotes" placeholder={dict.notasPlaceholder} value={movNotes} onChange={(e) => setMovNotes(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="movDate" className="text-sm font-medium text-slate-700">{dict.fecha}</Label>
                <Input id="movDate" type="date" value={movDate} onChange={(e) => setMovDate(e.target.value)} required />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" disabled={submitting}>
                {submitting ? "Procesando..." : movType === "income" ? dict.addMoney : dict.withdrawMoney}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
