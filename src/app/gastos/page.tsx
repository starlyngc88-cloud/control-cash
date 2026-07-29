"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getExpenses, createExpense, updateExpense, deleteExpense, getPeople, getBudgetTemplates, getBudgetCategories, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory, buildCategoryTree } from "@/lib/db"
import type { CategoryTreeNode } from "@/lib/db"
import type { Person, Expense, BudgetCategory } from "@/types"
import { Plus, Trash2, Pencil, ArrowUpCircle, Search, Filter, TrendingUp, List } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { friendlyError } from "@/lib/errors"
import { useMonthFilter } from "@/components/MonthFilterContext"

export default function GastosPage() {
  const [expenses, setExpenses] = useState<(Expense & { people: Pick<Person, "name"> | null; budget_categories: Pick<BudgetCategory, "id" | "name" | "template_id" | "budgeted"> | null })[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { t, fmt } = useLanguage()
  const g = t.gastos
  const { months } = useMonthFilter()

  const sorted = [...months].sort()
  const startDate = months.length > 0 ? sorted[0] + "-01" : ""
  const endDate = months.length > 0
    ? new Date(parseInt(sorted[sorted.length - 1].split("-")[0]), parseInt(sorted[sorted.length - 1].split("-")[1]), 0).toISOString().split("T")[0]
    : ""

  const [personId, setPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [budgetCatId, setBudgetCatId] = useState("")

  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [search, setSearch] = useState("")

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null)
  const [catName, setCatName] = useState("")

  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)
  const [catDeleteExpenses, setCatDeleteExpenses] = useState<Expense[]>([])

  const load = useCallback(async () => {
    const [e, p, templates] = await Promise.all([getExpenses({ startDate, endDate }), getPeople(), getBudgetTemplates()])
    const base = templates.find((t) => t.name.toLowerCase() === "modelo base")
    const bc = base ? await getBudgetCategories(base.id) : []
    setExpenses(e)
    setPeople(p)
    setBudgetCategories(bc)
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setPersonId("")
    setAmount("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setBudgetCatId("")
    setOpen(true)
  }

  const openEdit = (exp: Expense & { people: Pick<Person, "name"> | null; budget_categories: Pick<BudgetCategory, "id" | "name" | "template_id" | "budgeted"> | null }) => {
    setEditing(exp)
    setPersonId(exp.person_id)
    setAmount(String(exp.amount))
    setDescription(exp.description)
    setDate(exp.date)
    setBudgetCatId(exp.budget_category_id ?? "")
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId || !amount) return
    setSubmitting(true)
    try {
      const data = {
        person_id: personId,
        amount: parseFloat(amount),
        description,
        date,
        budget_category_id: budgetCatId || null,
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
      setDate(new Date().toISOString().split("T")[0])
      setBudgetCatId("")
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(g.deleteConfirm)) return
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

  const openNewCat = () => {
    setEditingCat(null)
    setCatName("")
    setOpenCat(true)
  }

  const openEditCat = (cat: BudgetCategory) => {
    setEditingCat(cat)
    setCatName(cat.name)
    setOpenCat(true)
  }

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return
    setSubmitting(true)
    try {
      const templates = await getBudgetTemplates()
      const base = templates.find((t) => t.name.toLowerCase() === "modelo base")
      if (!base) return
      if (editingCat) {
        await updateBudgetCategory(editingCat.id, { name: catName.trim(), budgeted: editingCat.budgeted })
      } else {
        await createBudgetCategory({ template_id: base.id, name: catName.trim(), budgeted: 0, parent_id: null })
      }
      setOpenCat(false)
      setEditingCat(null)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCat = async (catId: string, catName: string) => {
    const related = expenses.filter((e) => e.budget_category_id === catId)
    if (related.length > 0) {
      setCatDeleteExpenses(related)
      setCatToDelete({ id: catId, name: catName })
    } else {
      setSubmitting(true)
      try {
        await deleteBudgetCategory(catId)
        load()
      } catch (err) {
        setError(friendlyError(err))
      } finally {
        setSubmitting(false)
      }
    }
  }

  const confirmDeleteCat = async () => {
    if (!catToDelete) return
    setSubmitting(true)
    try {
      for (const exp of catDeleteExpenses) {
        await deleteExpense(exp.id)
      }
      await deleteBudgetCategory(catToDelete.id)
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
      e.budget_categories?.name?.toLowerCase().includes(q)
    )
  }, [expenses, search])

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const sinCategoria = expenses.filter((e) => !e.budget_category_id).length
  const masAlto = expenses.reduce((max, e) => Number(e.amount) > Number(max.amount) ? e : max, expenses[0] ?? null)

  const catGastos = new Map<string, number>()
  const catGastosId = new Map<string, number>()
  for (const e of expenses) {
    const key = e.budget_category_id ?? "__none__"
    catGastosId.set(key, (catGastosId.get(key) ?? 0) + Number(e.amount))
  }

  const topCatEntry = [...catGastosId.entries()]
    .filter(([id]) => id !== "__none__")
    .map(([id, amount]) => {
      const cat = budgetCategories.find((c) => c.id === id)
      return { id, name: cat?.name ?? "?", amount, budgeted: cat?.budgeted ?? 0 }
    })
    .sort((a, b) => b.amount - a.amount)

  const topCat = topCatEntry[0] ?? null
  const sobre = topCatEntry.filter((c) => c.amount > c.budgeted && c.budgeted > 0)
  const totalPresupuestado = budgetCategories.reduce((s, c) => s + Number(c.budgeted), 0)

  return (
    <div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}
      <div className="flex items-center justify-end mb-5">
        <Dialog open={openCat} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCat(v) }}>
          <DialogTrigger render={(props) => <Button {...props} variant="outline" onClick={openNewCat}><List className="size-4 mr-2" />Categoría</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCat ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
              <p className="text-xs text-slate-500 mt-1">Las categorías agrupan tus gastos para organizar el presupuesto.</p>
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
        <Dialog key={editing?.id ?? 'new'} open={open} onOpenChange={(v) => { if (!v) setEditing(null); setOpen(v) }}>
          <DialogTrigger render={(props) => <Button {...props} onClick={openNew}><Plus className="size-4 mr-2" />{g.newGasto}</Button>} />
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
                    <Label htmlFor="category" className="text-sm font-medium text-slate-700">{g.rubro}</Label>
                    <select
                      id="category"
                      value={budgetCatId}
                      onChange={(e) => setBudgetCatId(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                    >
                      <option value="">{g.sinRubro}</option>
                      {(() => {
                        const tree = buildCategoryTree(budgetCategories)
                        const flat: { id: string; name: string; depth: number }[] = []
                        const walk = (nodes: CategoryTreeNode[], depth: number) => {
                          for (const n of nodes) {
                            flat.push({ id: n.id, name: n.name, depth })
                            walk(n.children, depth + 1)
                          }
                        }
                        walk(tree, 0)
                        return flat.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {"\u00A0".repeat(cat.depth * 4)}{cat.depth > 0 ? "— " : ""}{cat.name}
                          </option>
                        ))
                      })()}
                    </select>
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
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total gastado</p>
              <h3 className="text-3xl font-bold text-rose-600">{fmt(total)}</h3>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
              <ArrowUpCircle className="size-6" />
            </div>
          </div>
          {totalPresupuestado > 0 && (
            <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${total > totalPresupuestado ? "bg-rose-500" : total / totalPresupuestado > 0.8 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, (total / totalPresupuestado) * 100)}%` }} />
            </div>
          )}
        </div>

        {masAlto && (
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Gasto récord</p>
                <h3 className="text-3xl font-bold text-rose-600">{fmt(Number(masAlto.amount))}</h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
                <ArrowUpCircle className="size-6" />
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-500 truncate">{masAlto.description || "Sin concepto"}</p>
          </div>
        )}

        {topCat ? (
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Categoría top</p>
                <h3 className="text-3xl font-bold text-rose-600">{fmt(topCat.amount)}</h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
                <ArrowUpCircle className="size-6" />
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-500 truncate">{topCat.name}</p>
            {topCat.budgeted > 0 && (
              <p className={`text-xs mt-1 ${topCat.amount > topCat.budgeted ? "text-rose-500 font-medium" : "text-emerald-600"}`}>
                {topCat.amount > topCat.budgeted
                  ? `${(topCat.amount / topCat.budgeted * 100 - 100).toFixed(0)}% sobre presupuesto`
                  : `Usado ${(topCat.amount / topCat.budgeted * 100).toFixed(0)}% del presupuesto`
                }
              </p>
            )}
          </div>
        ) : null}

        {sobre.length > 0 ? (
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between border-rose-200">
            <div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-rose-600">¡Sobre presupuesto!</p>
                <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
                  <ArrowUpCircle className="size-6" />
                </div>
              </div>
              <div className="space-y-0.5">
                {sobre.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-slate-500">{c.name}</span>
                    <span className="tabular-nums shrink-0 ml-1 font-medium text-rose-500">+{fmt(c.amount - c.budgeted)}</span>
                  </div>
                ))}
                {sobre.length > 3 && (
                  <p className="text-xs text-slate-400 mt-0.5">+{sobre.length - 3} más</p>
                )}
              </div>
            </div>
          </div>
        ) : sinCategoria > 0 ? (
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Sin categoría</p>
                <h3 className="text-3xl font-bold text-orange-500">{sinCategoria}</h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-orange-500">
                <ArrowUpCircle className="size-6" />
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-500">gastos sin clasificar</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Categorizado</p>
                <h3 className="text-3xl font-bold text-emerald-600">100%</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                <ArrowUpCircle className="size-6" />
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-500">todo clasificado</p>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar gasto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>
        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center bg-white shadow-sm transition-colors">
          <Filter className="size-4 mr-2" /> Filtros
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="border rounded-lg bg-white p-8 text-center">
          <p className="text-sm text-slate-500">{search ? "Sin resultados para la búsqueda" : g.empty}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoría</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Monto</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(exp.date).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                        <TrendingUp className="size-4" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">{exp.description || "Sin concepto"}</div>
                        {exp.people?.name && (
                          <div className="text-sm text-slate-500">{exp.people.name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {exp.budget_categories?.name ? (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-slate-100 text-slate-600">
                        {exp.budget_categories.name}
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-slate-50 text-slate-400">
                        Sin categoría
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-rose-600">
                    - {fmt(Number(exp.amount))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-slate-400 hover:text-indigo-600 transition-colors" onClick={() => openEdit(exp)}>
                      <Pencil className="size-4" />
                    </button>
                    <button className="text-slate-400 hover:text-rose-600 ml-3 transition-colors" onClick={() => handleDelete(exp.id)}>
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-500">Mostrando {filtered.length} de {expenses.length} gastos</span>
            <div className="flex space-x-1">
              <button className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-400 bg-slate-50 cursor-not-allowed">Anterior</button>
              <button className="px-3 py-1 border border-slate-200 rounded text-sm bg-indigo-600 text-white">1</button>
              <button className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50">Siguiente</button>
            </div>
          </div>
        </div>
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
