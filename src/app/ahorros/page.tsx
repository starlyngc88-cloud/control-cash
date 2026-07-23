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
} from "@/lib/db"
import type { Saving, SavingMovement, SavingCategory } from "@/types"
import { Plus, Trash2, Pencil, Goal, ArrowDownCircle, ArrowUpCircle, List, ChevronDown, ChevronRight } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

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
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const { t, fmt } = useLanguage()
  const dict = t.ahorros

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [savingCategoryId, setSavingCategoryId] = useState("")
  const [movType, setMovType] = useState<"income" | "withdrawal">("income")
  const [movAmount, setMovAmount] = useState("")
  const [movNotes, setMovNotes] = useState("")
  const [movDate, setMovDate] = useState(new Date().toISOString().split("T")[0])

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<SavingCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)

  const load = async () => {
    const [s, d, cats] = await Promise.all([getSavings(), getSavingsDashboard(), getSavingCategories()])
    setSavings(s)
    setDashboard(d)
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string | null; name: string; items: (Saving & { saving_categories: Pick<SavingCategory, "name"> | null })[] }>()
    for (const c of categories) {
      map.set(c.id, { id: c.id, name: c.name, items: [] })
    }
    for (const s of savings) {
      const catId = s.category_id ?? "__none__"
      const catName = s.saving_categories?.name || "Sin categoría"
      if (!map.has(catId)) map.set(catId, { id: s.category_id, name: catName, items: [] })
      map.get(catId)!.items.push(s)
    }
    return map
  }, [savings, categories])

  const openNewSaving = () => {
    setEditing(null)
    setName("")
    setDescription("")
    setSavingCategoryId("")
    setOpenSaving(true)
  }

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
  }

  const handleDeleteSaving = async (id: string) => {
    if (!confirm(dict.deleteConfirm)) return
    await deleteSaving(id)
    load()
  }

  const openNewMovement = (savingId: string) => {
    setMovementSavingId(savingId)
    setMovType("income")
    setMovAmount("")
    setMovNotes("")
    setMovDate(new Date().toISOString().split("T")[0])
    setOpenMovement(true)
  }

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movementSavingId || !movAmount) return
    await createSavingMovement({
      saving_id: movementSavingId,
      type: movType,
      amount: parseFloat(movAmount),
      notes: movNotes,
      movement_date: movDate,
    })
    setOpenMovement(false)
    setMovementSavingId(null)
    setSuccessMsg(true)
    setTimeout(() => setSuccessMsg(false), 3000)
    load()
  }

  const openNewCat = () => {
    setEditingCat(null)
    setCatName("")
    setOpenCat(true)
  }

  const openEditCat = (cat: SavingCategory) => {
    setEditingCat(cat)
    setCatName(cat.name)
    setOpenCat(true)
  }

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return
    if (editingCat) {
      await updateSavingCategory(editingCat.id, { name: catName.trim() })
    } else {
      await createSavingCategory({ name: catName.trim() })
    }
    setOpenCat(false)
    setEditingCat(null)
    setCatName("")
    load()
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
    const ids = savings.filter((s) => s.category_id === catToDelete.id).map((s) => s.id)
    await Promise.all(ids.map((id) => deleteSaving(id)))
    await deleteSavingCategory(catToDelete.id)
    setCatToDelete(null)
    load()
  }

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const totalAhorrado = dashboard?.totalAhorrado ?? 0
  const numHuchas = dashboard?.numHuchas ?? 0
  const recentMovements = dashboard?.recentMovements ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30">
            <Goal className="size-5" />
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
                  ¿Eliminar la categoría <strong>{catToDelete?.name}</strong>? Se eliminarán también las siguientes huchas:
                </p>
                {catDeleteExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay huchas asociadas.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {catDeleteExpenses.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-muted/30">
                        <span>{s.name}</span>
                        <span className="font-semibold text-amber-600">{fmt(Number(s.current_amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCatToDelete(null)}>Cancelar</Button>
                  <Button variant="destructive" onClick={confirmDeleteCat}>
                    Eliminar {catDeleteExpenses.length > 0 ? `(${catDeleteExpenses.length} huchas)` : ""}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog key={editing?.id ?? 'new'} open={openSaving} onOpenChange={(v) => { if (!v) setEditing(null); setOpenSaving(v) }}>
            <DialogTrigger render={(props) => <Button {...props} onClick={openNewSaving}><Plus className="size-4 mr-2" />{dict.newHucha}</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? dict.editTitle : dict.newTitle}</DialogTitle></DialogHeader>
              <form onSubmit={handleSavingSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{dict.nombre}</Label>
                  <Input id="name" placeholder={dict.nombrePlaceholder} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{dict.descripcion}</Label>
                  <Input id="description" placeholder={dict.descripcionPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catSelect">Categoría</Label>
                  <select
                    id="catSelect"
                    value={savingCategoryId}
                    onChange={(e) => setSavingCategoryId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  >
                    <option value="">— Sin categoría —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.totalAhorrado}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
              <Goal className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{fmt(totalAhorrado)}</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.numHuchas}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
              <Goal className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{numHuchas}</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.ultimosMovimientos}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
              <ArrowDownCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dict.noMovements}</p>
            ) : (
              <ul className="space-y-1">
                {recentMovements.map((m) => (
                  <li key={m.id} className="flex justify-between text-sm p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="truncate">
                      {m.savings?.name}{" "}
                      <span className="text-muted-foreground">· {m.notes || m.type}</span>
                    </span>
                    <span className={`font-semibold shrink-0 ${m.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {m.type === "income" ? "+" : "-"}{fmt(m.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {savings.length === 0 && categories.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{dict.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([key, { id: catId, name: catName, items }]) => {
            const isExpanded = expandedCats.has(key)
            const catTotal = items.reduce((s, e) => s + Number(e.current_amount), 0)
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
                    <span className="text-sm font-semibold text-amber-600">{fmt(catTotal)}</span>
                  </div>
                </div>
                {isExpanded && (
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {items.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border p-2.5 transition-all duration-200 hover:shadow-sm">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{s.name}</p>
                            {s.description && (
                              <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-sm font-semibold text-amber-600">{fmt(Number(s.current_amount))}</span>
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); openNewMovement(s.id) }}>
                              <ArrowDownCircle className="size-3.5 mr-1" />
                              {dict.addMoney}
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); setMovementSavingId(s.id); setMovType("withdrawal"); setMovAmount(""); setMovNotes(""); setMovDate(new Date().toISOString().split("T")[0]); setOpenMovement(true) }}>
                              <ArrowUpCircle className="size-3.5 mr-1" />
                              {dict.withdrawMoney}
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7 text-blue-500 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); openEditSaving(s) }}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7 text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteSaving(s.id) }}>
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

      <Dialog open={openMovement} onOpenChange={(v) => { if (!v) setMovementSavingId(null); setOpenMovement(v) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dict.movementTitle}</DialogTitle></DialogHeader>
          <form onSubmit={handleMovementSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{dict.movementType}</Label>
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
            <div className="space-y-2">
              <Label htmlFor="movAmount">{dict.monto}</Label>
              <Input id="movAmount" type="number" step="0.01" min="0.01" placeholder={dict.montoPlaceholder} value={movAmount} onChange={(e) => setMovAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="movNotes">{dict.notas}</Label>
              <Input id="movNotes" placeholder={dict.notasPlaceholder} value={movNotes} onChange={(e) => setMovNotes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="movDate">{dict.fecha}</Label>
              <Input id="movDate" type="date" value={movDate} onChange={(e) => setMovDate(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">
              {movType === "income" ? dict.addMoney : dict.withdrawMoney}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
