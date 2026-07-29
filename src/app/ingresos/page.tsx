"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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

import {
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
  getPeople,
  getIncomeCategories,
  createIncomeCategory,
  updateIncomeCategory,
  deleteIncomeCategory,
} from "@/lib/db"
import type { Person, Income, IncomeCategory } from "@/types"
import { Plus, Trash2, Pencil, TrendingDown, Search, Filter, List } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { friendlyError } from "@/lib/errors"
import { useMonthFilter } from "@/components/MonthFilterContext"

export default function IngresosPage() {
  const [incomes, setIncomes] = useState<(Income & { people: Pick<Person, "name"> | null; income_categories: Pick<IncomeCategory, "name"> | null })[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { t, fmt } = useLanguage()
  const inc = t.ingresos
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
  const [categoryId, setCategoryId] = useState("")

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<IncomeCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    const [i, p, cats] = await Promise.all([
      getIncomes({ startDate, endDate }),
      getPeople(),
      getIncomeCategories(),
    ])
    setIncomes(i)
    setPeople(p)
    setCategories(cats)
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setPersonId("")
    setAmount("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setCategoryId("")
    setOpen(true)
  }

  const openEdit = (inc: Income & { people: Pick<Person, "name"> | null; income_categories: Pick<IncomeCategory, "name"> | null }) => {
    setEditing(inc)
    setPersonId(inc.person_id)
    setAmount(String(inc.amount))
    setDescription(inc.description)
    setDate(inc.date)
    setCategoryId(inc.category_id ?? "")
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId || !amount) return
    setSubmitting(true)
    try {
      const data = { person_id: personId, amount: parseFloat(amount), description, date, category_id: categoryId || null }
      if (editing) {
        await updateIncome(editing.id, data)
      } else {
        await createIncome(data)
      }
      setOpen(false)
      setEditing(null)
      setPersonId("")
      setAmount("")
      setDescription("")
      setDate(new Date().toISOString().split("T")[0])
      setCategoryId("")
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(inc.deleteConfirm)) return
    setSubmitting(true)
    try {
      await deleteIncome(id)
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

  const openEditCat = (cat: IncomeCategory) => {
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
        await updateIncomeCategory(editingCat.id, { name: catName.trim() })
      } else {
        await createIncomeCategory({ name: catName.trim() })
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

  const catDeleteIncomes = catToDelete
    ? incomes.filter((inc) => inc.category_id === catToDelete.id)
    : []

  const handleDeleteCat = (id: string) => {
    const cat = categories.find((c) => c.id === id)
    if (cat) setCatToDelete({ id: cat.id, name: cat.name })
  }

  const confirmDeleteCat = async () => {
    if (!catToDelete) return
    setSubmitting(true)
    try {
      await deleteIncomeCategory(catToDelete.id)
      setCatToDelete(null)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return incomes
    const q = search.toLowerCase()
    return incomes.filter((i) =>
      i.description?.toLowerCase().includes(q) ||
      i.people?.name?.toLowerCase().includes(q) ||
      i.income_categories?.name?.toLowerCase().includes(q)
    )
  }, [incomes, search])

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}
      <div className="flex items-center justify-end mb-5">
        <Dialog open={openCat} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCat(v) }}>
          <DialogTrigger render={(props) => <Button {...props} variant="outline" onClick={() => openNewCat()}><List className="size-4 mr-2" />Categorías</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCat ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
              <p className="text-xs text-slate-500 mt-1">Las categorías organizan tus ingresos.</p>
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
                {catDeleteIncomes.length > 0 && (
                  <p className="mt-1 text-xs text-rose-500">Se eliminará la referencia en ingresos asociados.</p>
                )}
              </div>
              {catDeleteIncomes.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-2">
                  {catDeleteIncomes.map((inc) => (
                    <div key={inc.id} className="flex items-center justify-between text-sm px-3 py-1.5 rounded hover:bg-slate-50">
                      <span className="text-slate-700">{inc.description || "Sin concepto"}</span>
                      <span className="font-semibold text-emerald-600 tabular-nums">{fmt(Number(inc.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
                <Button variant="destructive" onClick={confirmDeleteCat} disabled={submitting}>{submitting ? "Eliminando..." : "Eliminar"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog key={editing?.id ?? 'new'} open={open} onOpenChange={(v) => { if (!v) setEditing(null); setOpen(v) }}>
          <DialogTrigger render={(props) => <Button {...props} onClick={openNew}><Plus className="size-4 mr-2" />{inc.newIngreso}</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? inc.editTitle : inc.newTitle}</DialogTitle>
              <p className="text-xs text-slate-500 mt-1">Completá los detalles del ingreso.</p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="persona" className="text-sm font-medium text-slate-700">{inc.persona}</Label>
                  <select
                    id="persona"
                    value={personId}
                    onChange={(e) => setPersonId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                    required
                  >
                    <option value="" disabled>{inc.selectPersona}</option>
                    {people.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-sm font-medium text-slate-700">{inc.monto}</Label>
                  <Input id="amount" type="number" step="0.01" min="0.01" placeholder={inc.montoPlaceholder} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm font-medium text-slate-700">{inc.concepto}</Label>
                  <Input id="description" placeholder={inc.conceptoPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="catSelect" className="text-sm font-medium text-slate-700">Categoría</Label>
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
                    <Label htmlFor="date" className="text-sm font-medium text-slate-700">{inc.fecha}</Label>
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
                <Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : editing ? inc.guardarCambios : inc.guardar}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Bar */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingDown className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total ingresado</p>
            <h3 className="text-3xl font-bold text-emerald-600">{fmt(total)}</h3>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Cantidad de ingresos</p>
          <p className="text-2xl font-bold text-slate-800">{incomes.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar ingreso..."
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
          <p className="text-sm text-slate-500">{search ? "Sin resultados para la búsqueda" : inc.empty}</p>
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
              {filtered.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(inc.date).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <TrendingDown className="size-4" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">{inc.description || "Sin concepto"}</div>
                        {inc.people?.name && (
                          <div className="text-sm text-slate-500">{inc.people.name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {inc.income_categories?.name ? (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-emerald-50 text-emerald-700">
                        {inc.income_categories.name}
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-slate-50 text-slate-400">
                        Sin categoría
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                    + {fmt(Number(inc.amount))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-slate-400 hover:text-indigo-600 transition-colors" onClick={() => openEdit(inc)}>
                      <Pencil className="size-4" />
                    </button>
                    <button className="text-slate-400 hover:text-rose-600 ml-3 transition-colors" onClick={() => handleDelete(inc.id)}>
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-500">Mostrando {filtered.length} de {incomes.length} ingresos</span>
            <div className="flex space-x-1">
              <button className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-400 bg-slate-50 cursor-not-allowed">Anterior</button>
              <button className="px-3 py-1 border border-slate-200 rounded text-sm bg-indigo-600 text-white">1</button>
              <button className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50">Siguiente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
