"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  createFutureExpense,
  updateFutureExpense,
  deleteFutureExpense,
  updateFutureExpenseStatus,
  getFutureExpensesDashboard,
  getFutureExpenseCategories,
  createFutureExpenseCategory,
  updateFutureExpenseCategory,
  deleteFutureExpenseCategory,
} from "@/lib/db"
import type { FutureExpense, FutureExpenseCategory } from "@/types"
import { Plus, Trash2, Pencil, Crosshair, CheckCircle2, ChevronDown, ChevronRight, List } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

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
  const [expenses, setExpenses] = useState<(FutureExpense & { future_expense_categories: Pick<FutureExpenseCategory, "name"> | null })[]>([])
  const [categories, setCategories] = useState<FutureExpenseCategory[]>([])
  const [dashboard, setDashboard] = useState<{
    next30: FutureExpense[]
    next90: FutureExpense[]
    totalPrevisto: number
    numPendientes: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const { t, fmt } = useLanguage()
  const dict = t.gastosFuturos

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FutureExpense | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [expectedAmount, setExpectedAmount] = useState("")
  const [expectedDate, setExpectedDate] = useState("")

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<FutureExpenseCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)

  const load = async () => {
    const [d, cats] = await Promise.all([getFutureExpensesDashboard(), getFutureExpenseCategories()])
    setExpenses(d.expenses)
    setDashboard({ next30: d.next30, next90: d.next90, totalPrevisto: d.totalPrevisto, numPendientes: d.numPendientes })
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const displayExpenses = useMemo(() => expenses.filter((e) => e.status !== "cancelled"), [expenses])

  const grouped = useMemo(() => {
    type Item = FutureExpense & { future_expense_categories: Pick<FutureExpenseCategory, "name"> | null }
    const map = new Map<string, { id: string | null; name: string; items: Item[] }>()
    for (const c of categories) {
      map.set(c.id, { id: c.id, name: c.name, items: [] })
    }
    for (const e of displayExpenses) {
      const catId = e.category_id ?? "__none__"
      const catName = e.future_expense_categories?.name || e.category || "Sin categoría"
      if (!map.has(catId)) map.set(catId, { id: e.category_id, name: catName, items: [] })
      map.get(catId)!.items.push(e)
    }
    return map
  }, [displayExpenses, categories])

  const openNew = () => {
    setEditing(null)
    setTitle("")
    setDescription("")
    setCategoryId("")
    setExpectedAmount("")
    setExpectedDate("")
    setPlanCuota("")
    setOpen(true)
  }

  const openEdit = (fe: FutureExpense) => {
    setEditing(fe)
    setTitle(fe.title)
    setDescription(fe.description)
    setCategoryId(fe.category_id ?? "")
    setExpectedAmount(String(fe.expected_amount))
    setExpectedDate(fe.expected_date)
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !expectedAmount || !expectedDate) return
    const cat = categories.find((c) => c.id === categoryId)
    const data = {
      title,
      description,
      category: cat?.name ?? categoryId,
      category_id: categoryId || null,
      expected_amount: parseFloat(expectedAmount),
      expected_date: expectedDate,
    }
    if (editing) {
      await updateFutureExpense(editing.id, data)
    } else {
      await createFutureExpense(data)
    }
    setOpen(false)
    setEditing(null)
    setSuccessMsg(true)
    setTimeout(() => setSuccessMsg(false), 3000)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(dict.deleteConfirm)) return
    await deleteFutureExpense(id)
    load()
  }

  const handleMarkCompleted = async (id: string) => {
    await updateFutureExpenseStatus(id, "completed")
    load()
  }

  const openNewCat = () => {
    setEditingCat(null)
    setCatName("")
    setOpenCat(true)
  }

  const openEditCat = (cat: FutureExpenseCategory) => {
    setEditingCat(cat)
    setCatName(cat.name)
    setOpenCat(true)
  }

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return
    if (editingCat) {
      await updateFutureExpenseCategory(editingCat.id, { name: catName.trim() })
    } else {
      await createFutureExpenseCategory({ name: catName.trim() })
    }
    setOpenCat(false)
    setEditingCat(null)
    setCatName("")
    load()
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
    const ids = expenses.filter((e) => e.category_id === catToDelete.id).map((e) => e.id)
    await Promise.all(ids.map((id) => deleteFutureExpense(id)))
    await deleteFutureExpenseCategory(catToDelete.id)
    setCatToDelete(null)
    load()
  }

  const [planCuota, setPlanCuota] = useState("")

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
  }, [expectedAmount, expectedDate, planCuota])

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30">
            <Crosshair className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{dict.title}</h2>
            <p className="text-sm text-muted-foreground">{dict.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={openCat} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCat(v) }}>
            <DialogTrigger render={(props) => <Button {...props} variant="outline" onClick={() => openNewCat()}><List className="size-4 mr-2" />Categoría</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>{editingCat ? "Editar categoría" : "Nueva categoría"}</DialogTitle></DialogHeader>
              <form onSubmit={handleCatSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="catName">Nombre</Label>
                  <Input id="catName" value={catName} onChange={(e) => setCatName(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">{editingCat ? "Guardar cambios" : "Crear categoría"}</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={!!catToDelete} onOpenChange={(v) => { if (!v) setCatToDelete(null) }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Eliminar categoría</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  ¿Eliminar la categoría <strong>{catToDelete?.name}</strong>? Se eliminarán también los siguientes gastos:
                </p>
                {catDeleteExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay gastos asociados.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {catDeleteExpenses.map((fe) => (
                      <div key={fe.id} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-muted/30">
                        <span>{fe.title}</span>
                        <span className="font-semibold text-orange-600">{fmt(Number(fe.expected_amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCatToDelete(null)}>Cancelar</Button>
                  <Button variant="destructive" onClick={confirmDeleteCat}>
                    Eliminar {catDeleteExpenses.length > 0 ? `(${catDeleteExpenses.length} gastos)` : ""}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog key={editing?.id ?? 'new'} open={open} onOpenChange={(v) => { if (!v) setEditing(null); setOpen(v) }}>
            <DialogTrigger render={(props) => <Button {...props} onClick={openNew}><Plus className="size-4 mr-2" />{dict.newTitle}</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? dict.editTitle : dict.newTitle}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{dict.titleLabel}</Label>
                  <Input id="title" placeholder={dict.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{dict.descripcion}</Label>
                  <Input id="description" placeholder={dict.descripcionPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catSelect">{dict.categoria}</Label>
                  <select
                    id="catSelect"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  >
                    <option value="">— Sin categoría —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">{dict.monto}</Label>
                  <Input id="amount" type="number" step="0.01" min="0.01" placeholder={dict.montoPlaceholder} value={expectedAmount} onChange={(e) => setExpectedAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">{dict.fecha}</Label>
                  <Input id="date" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planCuota">Ahorro mensual (opcional)</Label>
                  <Input id="planCuota" type="number" step="0.01" min="0.01" placeholder="0.00" value={planCuota} onChange={(e) => setPlanCuota(e.target.value)} />
                </div>
                {planCalc && (
                  <div className="rounded-lg border bg-orange-50 dark:bg-orange-900/20 p-3 space-y-1 text-sm">
                    {planCalc.type === "fecha" ? (
                      <p>Necesitas ahorrar <strong>{planCalc.cuota}</strong> por mes durante <strong>{planCalc.meses} meses</strong></p>
                    ) : (
                      <p>Ahorrando <strong>{fmt(parseFloat(planCuota || "0"))}</strong> por mes, alcanzas la meta en <strong>{planCalc.meses} meses</strong> (~{planCalc.fechaEst})</p>
                    )}
                  </div>
                )}
                <Button type="submit" className="w-full">{editing ? dict.guardarCambios : dict.guardar}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          {dict.successMessage}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.proximos30}</CardTitle>
            <span className="size-2.5 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{dashboard?.next30.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {fmt(dashboard?.next30.reduce((s, e) => s + Number(e.expected_amount), 0) ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.proximos90}</CardTitle>
            <span className="size-2.5 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{dashboard?.next90.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {fmt(dashboard?.next90.reduce((s, e) => s + Number(e.expected_amount), 0) ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.totalPrevisto}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30">
              <Crosshair className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{fmt(dashboard?.totalPrevisto ?? 0)}</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.pendientes}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30">
              <Crosshair className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{dashboard?.numPendientes ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {displayExpenses.length === 0 && categories.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{dict.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([key, { id: catId, name: catName, items }]) => {
            const isExpanded = expandedCats.has(key)
            const catTotal = items.reduce((s, e) => s + Number(e.expected_amount), 0)
            const cat = categories.find((c) => c.id === catId)
            return (
              <Card key={key} className="overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b cursor-pointer select-none hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedCats((prev) => {
                    const next = new Set(prev)
                    if (next.has(key)) next.delete(key)
                    else next.add(key)
                    return next
                  })}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                    <span className="text-sm font-semibold">{catName}</span>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {cat && (
                      <>
                        <Button variant="ghost" size="icon" className="size-6 text-blue-500 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); openEditCat(cat) }}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-6 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleDeleteCat(cat.id) }}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                    <span className="text-sm font-semibold text-orange-600">{fmt(catTotal)}</span>
                  </div>
                </div>
                {isExpanded && (
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {items.map((fe) => (
                        <div
                          key={fe.id}
                          className={`flex items-center justify-between rounded-lg border p-2.5 transition-all duration-200 hover:shadow-sm ${getUrgencyClass(fe.expected_date)}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`size-2 rounded-full shrink-0 ${getUrgencyDot(fe.expected_date)}`} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium">{fe.title}</p>
                                {fe.status === "completed" && (
                                  <span className="text-xs text-green-600 font-medium">{dict.statusCompleted}</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {fe.description || "\u00a0"}
                                {fe.description ? " · " : ""}
                                {new Date(fe.expected_date).toLocaleDateString("es-CO")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <span className="text-sm font-semibold text-orange-600">{fmt(Number(fe.expected_amount))}</span>
                            {fe.status === "planned" && (
                              <>
                                <Button variant="ghost" size="icon" className="size-7 text-emerald-500 hover:text-emerald-700" title={dict.markCompleted} onClick={() => handleMarkCompleted(fe.id)}>
                                  <CheckCircle2 className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-7 text-blue-500 hover:text-blue-700" onClick={() => openEdit(fe)}>
                                  <Pencil className="size-3.5" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" className="size-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(fe.id)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}


    </div>
  )
}
