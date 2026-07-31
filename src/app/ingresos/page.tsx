"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
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
import { Plus, Trash2, Pencil, TrendingDown, Search, Filter, List, ChevronDown, ChevronRight } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { friendlyError } from "@/lib/errors"
import { useHeaderActions } from "@/components/HeaderActionsContext"
import { useMonthFilter } from "@/components/MonthFilterContext"
import { Tooltip } from "@/components/ui/tooltip"

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

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<IncomeCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catSelectionPending, setCatSelectionPending] = useState(false)
  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)
  const [search, setSearch] = useState("")

  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false)
  const headerDropdownRef = useRef<HTMLDivElement>(null)
  const { setActions } = useHeaderActions()

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
                onClick={() => { setOpenCat(true); setHeaderDropdownOpen(false) }}
              >
                <List className="size-4 text-emerald-500" />
                Nueva categoría
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                onClick={() => { openNew(); setHeaderDropdownOpen(false) }}
              >
                <TrendingDown className="size-4 text-emerald-500" />
                Nuevo ingreso
              </button>
            </div>
          </>
        )}
      </div>
    )
    return () => setActions(null)
  }, [headerDropdownOpen, setActions])

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

  const openNewCat = (selectAfter = false) => {
    setEditingCat(null)
    setCatName("")
    setCatSelectionPending(selectAfter)
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
        const created = await createIncomeCategory({ name: catName.trim() })
        if (created) {
          setCategories((prev) => [...prev, created])
        }
        if (catSelectionPending && created?.id) {
          setCategoryId(created.id)
        }
      }
      setOpenCat(false)
      setEditingCat(null)
      setCatSelectionPending(false)
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

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string | null; name: string; items: (Income & { people: Pick<Person, "name"> | null; income_categories: Pick<IncomeCategory, "name"> | null })[] }>()
    for (const c of categories) {
      map.set(c.id, { id: c.id, name: c.name, items: [] })
    }
    for (const inc of filtered) {
      const catId = inc.category_id ?? "__none__"
      const catName = inc.income_categories?.name || "Sin categoría"
      if (!map.has(catId)) map.set(catId, { id: inc.category_id ?? null, name: catName, items: [] })
      map.get(catId)!.items.push(inc)
    }
    return map
  }, [filtered, categories])

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0)
  const masAlto = incomes.reduce((max, i) => Number(i.amount) > Number(max.amount) ? i : max, incomes[0] ?? null)
  const sinCategoria = incomes.filter((i) => !i.category_id).length

  const allExpanded = [...grouped.keys()].length > 0 && [...grouped.keys()].every((k) => expandedCats.has(k))
  const hasItems = incomes.length > 0 || categories.length > 0

  return (
    <div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}
      <Dialog open={openCat} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCat(v) }}>
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
                    <Label className="text-sm font-medium text-slate-700">Categoría</Label>
                    <div className="flex gap-2">
                      <select
                        id="catSelect"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                      >
                        <option value="">Sin categoría</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => openNewCat(true)} className="size-9 shrink-0 rounded-lg border border-input bg-white flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors">
                        <Plus className="size-4" />
                      </button>
                    </div>
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

      {/* KPI Cards */}
      <div className="grid gap-2 md:grid-cols-4 mb-3">
        <Tooltip content="Suma de todos los ingresos del período" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Total ingresado</p>
                <h3 className="text-lg font-bold text-emerald-600">{fmt(total)}</h3>
              </div>
              <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                <TrendingDown className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>

        {masAlto && (
          <Tooltip content="El ingreso individual más alto del período" className="h-full">
            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-medium text-slate-500 mb-0.5">Ingreso récord</p>
                  <h3 className="text-lg font-bold text-emerald-600">{fmt(Number(masAlto.amount))}</h3>
                </div>
                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                  <TrendingDown className="size-3.5" />
                </div>
              </div>
              <p className="mt-1 text-[10px] text-slate-500 truncate">{masAlto.description || "Sin concepto"}</p>
            </div>
          </Tooltip>
        )}

        <Tooltip content="Cantidad de categorías de ingresos creadas" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Categorías</p>
                <h3 className="text-lg font-bold text-slate-800">{categories.length}</h3>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg text-slate-600">
                <List className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>

        <Tooltip content="Ingresos del período sin categoría asignada" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">Sin categoría</p>
                <h3 className={`text-lg font-bold ${sinCategoria > 0 ? "text-orange-500" : "text-emerald-600"}`}>{sinCategoria}</h3>
              </div>
              <div className={`p-1.5 rounded-lg ${sinCategoria > 0 ? "bg-orange-50 text-orange-500" : "bg-emerald-50 text-emerald-600"}`}>
                <TrendingDown className="size-3.5" />
              </div>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">{sinCategoria > 0 ? "ingresos sin clasificar" : "todo clasificado"}</p>
          </div>
        </Tooltip>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-xs mb-3">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar ingreso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        />
      </div>

      {/* Grouped list */}
      {!hasItems ? (
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm text-center">
          <p className="text-xs text-slate-500">{search ? "Sin resultados para la búsqueda" : inc.empty}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ingresos por categoría</span>
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
              const catTotal = items.reduce((s, i) => s + Number(i.amount), 0)
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
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 mr-0.5" onClick={() => { setEditingCat(cat); setCatName(cat.name); setOpenCat(true) }}>
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

                  {isExpanded && items.map((inc) => (
                    <div key={inc.id} className="flex items-center px-4 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                          <TrendingDown className="size-3" />
                        </div>
                        <div className="ml-2.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-slate-900 truncate">{inc.description || "Sin concepto"}</p>
                            <span className="text-[10px] text-slate-400 shrink-0">{new Date(inc.date).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
                          </div>
                          {inc.people?.name && <p className="text-[10px] text-slate-500">{inc.people.name}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-xs font-semibold text-emerald-600 tabular-nums">+ {fmt(Number(inc.amount))}</span>
                        <div className="flex items-center gap-0.5">
                          <button className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5" onClick={() => openEdit(inc)}>
                            <Pencil className="size-3" />
                          </button>
                          <button className="text-slate-400 hover:text-rose-600 transition-colors p-0.5" onClick={() => handleDelete(inc.id)}>
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
            <span className="text-xs font-semibold text-emerald-600">Total: {fmt(total)}</span>
            <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors" onClick={openNew}>
              <Plus className="size-3" /> {inc.newIngreso}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
