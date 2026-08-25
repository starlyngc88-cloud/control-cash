"use client"

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react"
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
import { getExpenses, createExpense, updateExpense, deleteExpense, getPeople, getExpenseCategories, getBudgetCategoriesForMonth, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory, getSavings } from "@/lib/db"
import type { Person, Expense, ExpenseCategory, BudgetCategory } from "@/types"
import { Plus, Trash2, Pencil, ArrowUpCircle, Search, TrendingUp, List, ChevronDown, ChevronRight, X } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { friendlyError } from "@/lib/errors"
import { toLocalDateString, todayString } from "@/lib/utils"
import { useHeaderActions } from "@/components/HeaderActionsContext"
import { useCashflowFilter } from "@/components/contexts/CashflowFilterContext"
import { useSearchParams } from "next/navigation"
import { Tooltip } from "@/components/ui/tooltip"

const buildGrouped = (tab: "categoria" | "disponible" | "hucha", expenseCategories: ExpenseCategory[], items: (Expense & { people: Pick<Person, "name"> | null; expense_categories: Pick<ExpenseCategory, "id" | "name"> | null; savings: Pick<import("@/types").Saving, "id" | "name"> | null })[]) => {
    const map = new Map<string, { id: string | null; name: string; items: (Expense & { people: Pick<Person, "name"> | null; expense_categories: Pick<ExpenseCategory, "id" | "name"> | null; savings: Pick<import("@/types").Saving, "id" | "name"> | null })[] }>()
    for (const c of expenseCategories) {
      if (c.tab === "disponible" || c.tab === "hucha") { if (c.tab !== tab) continue } else { if (tab !== "categoria") continue }
      map.set(c.id, { id: c.id, name: c.name, items: [] })
    }
    for (const e of items) {
      const catId = e.expense_category_id ?? "__none__"
      const cat = expenseCategories.find((c) => c.id === catId)
      if (cat && (cat.tab === "disponible" || cat.tab === "hucha")) { if (cat.tab !== tab) continue }
      const catName = e.expense_categories?.name || "Sin categoría"
      if (!map.has(catId)) map.set(catId, { id: e.expense_category_id ?? null, name: catName, items: [] })
      map.get(catId)!.items.push(e)
    }
    return map
  }

export default function GastosPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando...</p>}>
      <GastosPageInner />
    </Suspense>
  )
}

function GastosPageInner() {
  const [expenses, setExpenses] = useState<(Expense & { people: Pick<Person, "name"> | null; expense_categories: Pick<ExpenseCategory, "id" | "name"> | null; savings: Pick<import("@/types").Saving, "id" | "name"> | null })[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { t, fmt } = useLanguage()
  const g = t.gastos
  const { startDate, endDate } = useCashflowFilter()
  const searchParams = useSearchParams()

  const [personId, setPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(todayString())
  const [expenseCategoryId, setExpenseCategoryId] = useState("")
  const [budgetCategoryId, setBudgetCategoryId] = useState("")
  const [assumeAvailable, setAssumeAvailable] = useState(false)
  const [savingId, setSavingId] = useState("")

  const [savings, setSavings] = useState<import("@/types").Saving[]>([])

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [budgetCategories, setBudgetCategories] = useState<(BudgetCategory & { budget_templates: Pick<import("@/types").BudgetTemplate, "name"> })[]>([])
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"categoria" | "disponible" | "hucha">("categoria")
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<import("@/types").ExpenseCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catTab, setCatTab] = useState<"categoria" | "disponible" | "hucha">("categoria")

  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)
  const [catDeleteExpenses, setCatDeleteExpenses] = useState<Expense[]>([])
  const [catSelectionPending, setCatSelectionPending] = useState(false)

  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false)
  const headerDropdownRef = useRef<HTMLDivElement>(null)
  const { setActions } = useHeaderActions()

  const openNew = useCallback(() => {
    setEditing(null)
    setPersonId("")
    setAmount("")
    setDescription("")
    setDate(todayString())
    setExpenseCategoryId("")
    setBudgetCategoryId("")
    setAssumeAvailable(false)
    setSavingId("")
    setOpen(true)
  }, [])

  const openNewCat = useCallback((selectAfter = false, tab?: "categoria" | "disponible" | "hucha") => {
    setEditingCat(null)
    setCatName("")
    setCatTab(tab ?? view)
    setCatSelectionPending(selectAfter)
    setOpenCat(true)
  }, [view])

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
                onClick={() => { openNewCat(false); setHeaderDropdownOpen(false) }}
              >
                <List className="size-4 text-rose-500" />
                Nueva categoría
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                onClick={() => { openNew(); setHeaderDropdownOpen(false) }}
              >
                <ArrowUpCircle className="size-4 text-rose-500" />
                Nuevo gasto
              </button>
            </div>
          </>
        )}
      </div>
    )
    return () => setActions(null)
  }, [headerDropdownOpen, setActions, openNewCat, openNew])

  const load = useCallback(async () => {
    try {
      const activeMonth = startDate ? startDate.slice(0, 7) : ""
      const [e, p, cats, bCats, s] = await Promise.all([getExpenses({ startDate, endDate }), getPeople(), getExpenseCategories(), activeMonth ? getBudgetCategoriesForMonth(activeMonth) : Promise.resolve([]), getSavings()])
      setExpenses(e)
      setPeople(p)
      setExpenseCategories(cats)
      setBudgetCategories(bCats)
      setSavings(s)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { void (async () => { await load() })() }, [load])

  useEffect(() => {
    const hucha = searchParams.get("hucha")
    if (hucha && !open) {
      const timer = setTimeout(() => {
        setSavingId(hucha)
        setAssumeAvailable(false)
        setBudgetCategoryId("")
        setView("hucha")
        setOpen(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [searchParams, open])

  const openEdit = (exp: Expense & { people: Pick<Person, "name"> | null; expense_categories: Pick<ExpenseCategory, "id" | "name"> | null; savings: Pick<import("@/types").Saving, "id" | "name"> | null }) => {
    setEditing(exp)
    setPersonId(exp.person_id)
    setAmount(String(exp.amount))
    setDescription(exp.description)
    setDate(exp.date)
    setExpenseCategoryId(exp.expense_category_id ?? "")
    setBudgetCategoryId(exp.budget_category_id ?? "")
    setAssumeAvailable(!exp.budget_category_id)
    setSavingId(exp.saving_id ?? "")
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId || !amount) return
    if (!budgetCategoryId && !assumeAvailable && !savingId) {
      setError(g.rubroRequerido)
      return
    }
    setSubmitting(true)
    try {
      const data = {
        person_id: personId,
        amount: parseFloat(amount),
        description,
        date,
        expense_category_id: expenseCategoryId || null,
        budget_category_id: budgetCategoryId || null,
        saving_id: savingId || null,
      }
      if (editing) {
        await updateExpense(editing.id, data)
      } else {
        await createExpense(data)
      }
      setOpen(false)
      setEditing(null)
      setPersonId("")
      setAmount("")
      setDescription("")
      setDate(todayString())
      setExpenseCategoryId("")
      setSavingId("")
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    // Obtener información del gasto para el diálogo
    const expense = expenses.find((e) => e.id === id)
    const hasSavingMovement = expense?.saving_id ? true : false

    const confirmMsg = hasSavingMovement
      ? `${g.deleteConfirm}\nEliminará también el/los movimiento(s) de hucha asociado(s) con este gasto.`
      : g.deleteConfirm

    if (!confirm(confirmMsg)) return
    setSubmitting(true)
    try {
      await deleteExpense(id)
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
        await updateExpenseCategory(editingCat.id, { name: catName.trim(), tab: catTab })
      } else {
        const created = await createExpenseCategory({ name: catName.trim(), tab: catTab })
        if (created) {
          setExpenseCategories((prev) => [...prev, created])
        }
        if (catSelectionPending && created?.id) {
          setExpenseCategoryId(created.id)
        }
      }
      setOpenCat(false)
      setEditingCat(null)
      setCatSelectionPending(false)
      setCatTab("categoria")
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCat = (catId: string, catName: string) => {
    const related = expenses.filter((e) => e.expense_category_id === catId)
    setCatDeleteExpenses(related)
    setCatToDelete({ id: catId, name: catName })
  }

  const confirmDeleteCat = async () => {
    if (!catToDelete) return
    setSubmitting(true)
    try {
      for (const exp of catDeleteExpenses) {
        await deleteExpense(exp.id)
      }
      await deleteExpenseCategory(catToDelete.id)
      setCatToDelete(null)
      setCatDeleteExpenses([])
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return expenses
    const q = search.toLowerCase()
    return expenses.filter((e) =>
      e.description?.toLowerCase().includes(q) ||
      e.people?.name?.toLowerCase().includes(q) ||
      e.expense_categories?.name?.toLowerCase().includes(q)
    )
  }, [expenses, search])

    const disponibleItems = useMemo(() => filtered.filter((e) => !e.budget_category_id && !e.saving_id), [filtered])

  const huchaItems = useMemo(() => filtered.filter((e) => !!e.saving_id), [filtered])

  const categoriaItems = useMemo(() => filtered.filter((e) => !!e.budget_category_id), [filtered])

  const grouped = useMemo(() => buildGrouped("categoria", expenseCategories, categoriaItems), [categoriaItems, expenseCategories])
  const groupedDisponible = useMemo(() => buildGrouped("disponible", expenseCategories, disponibleItems), [disponibleItems, expenseCategories])
  const groupedHucha = useMemo(() => buildGrouped("hucha", expenseCategories, huchaItems), [huchaItems, expenseCategories])

  const formTab: "categoria" | "disponible" | "hucha" = savingId ? "hucha" : assumeAvailable ? "disponible" : "categoria"
  const formCategories = useMemo(
    () => expenseCategories.filter((c) => (c.tab === "disponible" || c.tab === "hucha") ? c.tab === formTab : formTab === "categoria"),
    [expenseCategories, formTab]
  )

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const masAlto = expenses.reduce((max, e) => Number(e.amount) > Number(max.amount) ? e : max, expenses[0] ?? null)
  const sinCategoria = expenses.filter((e) => !e.expense_category_id).length

  const allExpanded = [...grouped.keys()].length > 0 && [...grouped.keys()].every((k) => expandedCats.has(k))
  const hasItems = expenses.length > 0 || expenseCategories.length > 0

  const renderExpenseRow = (exp: Expense & { people: Pick<Person, "name"> | null; expense_categories: Pick<ExpenseCategory, "id" | "name"> | null; savings: Pick<import("@/types").Saving, "id" | "name"> | null }) => (
    <div key={exp.id} className="flex items-center px-4 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
      <div className="flex items-center flex-1 min-w-0">
        <div className="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center bg-rose-100 text-rose-600">
          <TrendingUp className="size-3" />
        </div>
        <div className="ml-2.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-slate-900 truncate">{exp.description || "Sin concepto"}</p>
            <span className="text-[10px] text-slate-400 shrink-0">{new Date(exp.date + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
          </div>
          {exp.people?.name && <p className="text-[10px] text-slate-500">{exp.people.name}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        {exp.savings?.name && <span className="text-[10px] text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">{exp.savings.name}</span>}
        <span className="text-xs font-semibold text-rose-600 tabular-nums">- {fmt(Number(exp.amount))}</span>
        <div className="flex items-center gap-0.5">
          <button className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5" onClick={() => openEdit(exp)}>
            <Pencil className="size-3" />
          </button>
          <button className="text-slate-400 hover:text-rose-600 transition-colors p-0.5" onClick={() => handleDelete(exp.id)}>
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}
      <Dialog open={openCat} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCat(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Las categorías agrupan tus gastos.</p>
          </DialogHeader>
          <form onSubmit={handleCatSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-sm font-medium text-slate-700">Nombre</Label>
                <Input id="catName" value={catName} onChange={(e) => setCatName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="catTab" className="text-sm font-medium text-slate-700">{g.catPerteneceA}</Label>
                <select
                  id="catTab"
                  value={catTab}
                  onChange={(e) => setCatTab(e.target.value as "categoria" | "disponible" | "hucha")}
                  className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                >
                  <option value="categoria">{g.viewCategoria}</option>
                  <option value="disponible">{g.viewDisponible}</option>
                  <option value="hucha">{g.viewHucha}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : editingCat ? "Guardar cambios" : "Crear categoría"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog key={editing?.id ?? 'new'} open={open} onOpenChange={(v) => { if (!v) setEditing(null); setOpen(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? g.editTitle : g.newTitle}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Completá los detalles del gasto.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="persona" className="text-sm font-medium text-slate-700">{g.persona}</Label>
                <div className="relative">
                  <select
                    id="persona"
                    value={personId}
                    onChange={(e) => setPersonId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                    required
                  >
                    <option value="" disabled>{g.selectPersona}</option>
                    {people.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-sm font-medium text-slate-700">{g.monto}</Label>
                <Input id="amount" type="number" step="0.01" min="0.01" placeholder={g.montoPlaceholder} value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">{g.concepto}</Label>
                <Input id="description" placeholder={g.conceptoPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="date" className="text-sm font-medium text-slate-700">{g.fecha}</Label>
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">{g.rubro}</Label>
                    <div className="flex gap-2">
                      <select
                        id="category"
                        value={budgetCategoryId}
                        onChange={(e) => { setBudgetCategoryId(e.target.value); if (e.target.value) { setAssumeAvailable(false); setSavingId("") } }}
                        disabled={assumeAvailable}
                        className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none disabled:opacity-60"
                      >
                        <option value="" disabled>{g.sinRubro}</option>
                        {(() => {
                          const grouped = new Map<string, typeof budgetCategories>()
                          for (const bc of budgetCategories) {
                            const tpl = bc.budget_templates?.name ?? "Sin plantilla"
                            if (!grouped.has(tpl)) grouped.set(tpl, [])
                            grouped.get(tpl)!.push(bc)
                          }
                          return Array.from(grouped.entries()).map(([tplName, cats]) => (
                            <optgroup key={tplName} label={tplName}>
                              {cats.map((bc) => (
                                <option key={bc.id} value={bc.id}>{bc.name}</option>
                              ))}
                            </optgroup>
                          ))
                        })()}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={assumeAvailable}
                        onChange={(e) => { setAssumeAvailable(e.target.checked); if (e.target.checked) { setBudgetCategoryId(""); setSavingId("") } }}
                        className="accent-indigo-600 rounded"
                      />
                      {g.asumirDisponible}
                    </label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">{g.hucha}</Label>
                  <div className="flex gap-2">
                    <select
                      id="saving"
                      value={savingId}
                      onChange={(e) => { setSavingId(e.target.value); if (e.target.value) { setBudgetCategoryId(""); setAssumeAvailable(false) } }}
                      className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                    >
                      <option value="">{g.sinHucha}</option>
                      {savings.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setSavingId("")} className="size-9 shrink-0 rounded-lg border border-input bg-white flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors">
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Categoría de gastos</Label>
                  <div className="flex gap-2">
                    <select
                      id="expenseCategory"
                      value={expenseCategoryId}
                      onChange={(e) => setExpenseCategoryId(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                    >
                      <option value="">Sin categoría</option>
                      {formCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => openNewCat(true, formTab)} className="size-9 shrink-0 rounded-lg border border-input bg-white flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors">
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : editing ? g.guardarCambios : g.guardar}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* KPI Cards */}
      <div className="grid gap-2 md:grid-cols-4 mb-3">
        <Tooltip content="Suma de todos los gastos del período" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Total gastado</p>
                <h3 className="text-lg font-bold text-rose-600">{fmt(total)}</h3>
              </div>
              <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
                <ArrowUpCircle className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>

        {masAlto && (
          <Tooltip content="El gasto individual más alto del período" className="h-full">
            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-0.5">Gasto récord</p>
                  <h3 className="text-lg font-bold text-rose-600">{fmt(Number(masAlto.amount))}</h3>
                </div>
                <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
                  <ArrowUpCircle className="size-3.5" />
                </div>
              </div>
              <p className="mt-1 text-[10px] text-slate-500 truncate">{masAlto.description || "Sin concepto"}</p>
            </div>
          </Tooltip>
        )}

        <Tooltip content="Cantidad de categorías de gastos creadas" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Categorías</p>
                <h3 className="text-lg font-bold text-slate-800">{expenseCategories.length}</h3>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg text-slate-600">
                <List className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>

        <Tooltip content="Gastos del período sin categoría asignada" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Sin categoría</p>
                <h3 className={`text-lg font-bold ${sinCategoria > 0 ? "text-orange-500" : "text-emerald-600"}`}>{sinCategoria}</h3>
              </div>
              <div className={`p-1.5 rounded-lg ${sinCategoria > 0 ? "bg-orange-50 text-orange-500" : "bg-emerald-50 text-emerald-600"}`}>
                <ArrowUpCircle className="size-3.5" />
              </div>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">{sinCategoria > 0 ? "gastos sin clasificar" : "todo clasificado"}</p>
          </div>
        </Tooltip>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-xs mb-3">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar gasto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        />
      </div>

      {/* Views tabs */}
      <div className="flex gap-1 mb-3 border-b border-slate-200 overflow-x-auto">
        {([
          { key: "categoria", label: g.viewCategoria, icon: <List className="size-4" /> },
          { key: "disponible", label: g.viewDisponible, icon: <ArrowUpCircle className="size-4" /> },
          { key: "hucha", label: g.viewHucha, icon: <TrendingUp className="size-4" /> },
        ] as { key: "categoria" | "disponible" | "hucha"; label: string; icon: React.ReactNode }[]).map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              view === v.key ? "text-indigo-600 border-indigo-600" : "text-slate-500 border-transparent hover:text-slate-700"
            }`}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {view === "categoria" && (
        <>
          {!hasItems ? (
            <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm text-center">
              <p className="text-xs text-slate-500">{search ? "Sin resultados para la búsqueda" : g.empty}</p>
            </div>
          ) : (
            <GroupedExpenseList
              title="Gastos por categoría"
              groups={grouped}
              expandedKeys={expandedCats}
              onToggle={(key) => setExpandedCats((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })}
              onExpandAll={() => { if (allExpanded) setExpandedCats(new Set()); else setExpandedCats(new Set([...grouped.keys()])) }}
              allExpanded={allExpanded}
              showCatActions
              expenseCategories={expenseCategories}
              onEditCat={(cat) => { setEditingCat(cat); setCatName(cat.name); setCatTab(cat.tab ?? "categoria"); setOpenCat(true) }}
              onDeleteCat={handleDeleteCat}
              onNew={openNew}
              newLabel={g.newGasto}
              renderRow={renderExpenseRow}
              fmt={fmt}
              total={categoriaItems.reduce((s, e) => s + Number(e.amount), 0)}
            />
          )}
        </>
      )}

      {view === "disponible" && (
        <GroupedExpenseList
          title="Disponible para gastar"
          groups={groupedDisponible}
          expandedKeys={expandedCats}
          onToggle={(key) => setExpandedCats((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })}
          onExpandAll={() => { if (allExpanded) setExpandedCats(new Set()); else setExpandedCats(new Set([...groupedDisponible.keys()])) }}
          allExpanded={allExpanded}
          showCatActions
          expenseCategories={expenseCategories}
          onEditCat={(cat) => { setEditingCat(cat); setCatName(cat.name); setCatTab(cat.tab ?? "disponible"); setOpenCat(true) }}
          onDeleteCat={handleDeleteCat}
          onNew={openNew}
          newLabel={g.newGasto}
          renderRow={renderExpenseRow}
          fmt={fmt}
          total={disponibleItems.reduce((s, e) => s + Number(e.amount), 0)}
          emptyText="No hay gastos asumidos del disponible para gastar."
        />
      )}

      {view === "hucha" && (
        <GroupedExpenseList
          title="Gastos por hucha"
          groups={groupedHucha}
          expandedKeys={expandedCats}
          onToggle={(key) => setExpandedCats((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })}
          onExpandAll={() => { if (allExpanded) setExpandedCats(new Set()); else setExpandedCats(new Set([...groupedHucha.keys()])) }}
          allExpanded={allExpanded}
          showCatActions
          expenseCategories={expenseCategories}
          onEditCat={(cat) => { setEditingCat(cat); setCatName(cat.name); setCatTab(cat.tab ?? "hucha"); setOpenCat(true) }}
          onDeleteCat={handleDeleteCat}
          onNew={openNew}
          newLabel={g.newGasto}
          renderRow={renderExpenseRow}
          fmt={fmt}
          total={huchaItems.reduce((s, e) => s + Number(e.amount), 0)}
          emptyText="No hay gastos vinculados a una hucha."
        />
      )}

      {/* Category Delete Dialog */}
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
                <p className="mt-1 text-xs text-rose-500">
                  Los siguientes gastos asociados también serán eliminados:
                </p>
              )}
              {catDeleteExpenses.length === 0 && (
                <p className="mt-1 text-xs text-rose-400">No hay gastos asociados.</p>
              )}
            </div>
            {catDeleteExpenses.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-2">
                {catDeleteExpenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between text-sm px-3 py-1.5 rounded hover:bg-slate-50">
                    <span className="truncate mr-2 text-slate-700">{exp.description || "Sin concepto"}</span>
                    <span className="font-semibold text-rose-600 shrink-0 tabular-nums">{fmt(Number(exp.amount))}</span>
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
    </div>
  )
}

function GroupedExpenseList(props: {
  title: string
  groups: Map<string, { id: string | null; name: string; items: (Expense & { people: Pick<Person, "name"> | null; expense_categories: Pick<ExpenseCategory, "id" | "name"> | null; savings: Pick<import("@/types").Saving, "id" | "name"> | null })[] }>
  expandedKeys: Set<string>
  onToggle: (key: string) => void
  onExpandAll: () => void
  allExpanded: boolean
  showCatActions?: boolean
  expenseCategories: ExpenseCategory[]
  onEditCat: (cat: ExpenseCategory) => void
  onDeleteCat: (catId: string, catName: string) => void
  onNew: () => void
  newLabel: string
  renderRow: (exp: Expense & { people: Pick<Person, "name"> | null; expense_categories: Pick<ExpenseCategory, "id" | "name"> | null; savings: Pick<import("@/types").Saving, "id" | "name"> | null }) => React.ReactElement
  fmt: (n: number) => string
  total: number
  emptyText?: string
}) {
  const { title, groups, expandedKeys, onToggle, onExpandAll, allExpanded, showCatActions, expenseCategories, onEditCat, onDeleteCat, onNew, newLabel, renderRow, fmt, total, emptyText } = props

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onExpandAll}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
          >
            {allExpanded ? "Contraer todo" : "Expandir todo"}
          </button>
          <span className="text-sm font-bold text-rose-600 tabular-nums">{fmt(total)}</span>
        </div>
      </div>
      {groups.size === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-slate-500">{emptyText}</p>
        </div>
      ) : (        <>
          <div>
            {Array.from(groups.entries()).map(([key, { id: catId, name: catName, items }]) => {
              const isExpanded = expandedKeys.has(key)
              const catTotal = items.reduce((s, e) => s + Number(e.amount), 0)
              const cat = expenseCategories.find((c) => c.id === catId)
              return (
                <div key={key}>
                  <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <button onClick={() => onToggle(key)} className="text-slate-400 hover:text-slate-600 mr-2">
                      {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                    {showCatActions && cat && (
                      <>
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 mr-0.5" onClick={() => onEditCat(cat)}>
                          <Pencil className="size-3" />
                        </button>
                        <button className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 mr-0.5" onClick={() => onDeleteCat(cat.id, cat.name)}>
                          <Trash2 className="size-3" />
                        </button>
                      </>
                    )}
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{catName}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">({items.length})</span>
                    <span className="ml-auto text-xs font-semibold text-rose-600 tabular-nums">{fmt(catTotal)}</span>
                  </div>
                  {isExpanded && items.map(renderRow)}
                </div>
              )
            })}
          </div>
          <div className="bg-white px-4 py-2.5 border-t border-slate-200 flex items-center justify-end">
            <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors" onClick={onNew}>
              <Plus className="size-3" /> {newLabel}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
