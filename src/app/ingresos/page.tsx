"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Plus, Trash2, Pencil, ArrowDownCircle, List } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function IngresosPage() {
  const [incomes, setIncomes] = useState<(Income & { people: Pick<Person, "name"> | null; income_categories: Pick<IncomeCategory, "name"> | null })[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [loading, setLoading] = useState(true)
  const { t, fmt } = useLanguage()
  const inc = t.ingresos

  const [personId, setPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [categoryId, setCategoryId] = useState("")

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<IncomeCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)

  const load = async () => {
    const [i, p, cats] = await Promise.all([getIncomes(), getPeople(), getIncomeCategories()])
    setIncomes(i)
    setPeople(p)
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
  }

  const handleDelete = async (id: string) => {
    if (!confirm(inc.deleteConfirm)) return
    await deleteIncome(id)
    load()
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
    if (editingCat) {
      await updateIncomeCategory(editingCat.id, { name: catName.trim() })
    } else {
      await createIncomeCategory({ name: catName.trim() })
    }
    setOpenCat(false)
    setEditingCat(null)
    load()
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
    await deleteIncomeCategory(catToDelete.id)
    setCatToDelete(null)
    load()
  }

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="-mx-6 -mt-6 p-6 min-h-[calc(100vh-3rem)] bg-gradient-to-b from-transparent to-muted/20">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30">
            <ArrowDownCircle className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{inc.title}</h2>
            <p className="text-sm text-muted-foreground">{inc.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={openCat} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCat(v) }}>
            <DialogTrigger render={(props) => <Button {...props} variant="outline" onClick={() => openNewCat()}><List className="size-4 mr-2" />Categorías</Button>} />
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
                  ¿Eliminar la categoría <strong>{catToDelete?.name}</strong>? Se eliminará la referencia en ingresos asociados.
                </p>
                {catDeleteIncomes.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {catDeleteIncomes.map((inc) => (
                      <div key={inc.id} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-muted/30">
                        <span>{inc.description || "Sin concepto"}</span>
                        <span className="font-semibold text-green-600">{fmt(Number(inc.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCatToDelete(null)}>Cancelar</Button>
                  <Button variant="destructive" onClick={confirmDeleteCat}>Eliminar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog key={editing?.id ?? 'new'} open={open} onOpenChange={(v) => { if (!v) setEditing(null); setOpen(v) }}>
            <DialogTrigger render={(props) => <Button {...props} onClick={openNew}><Plus className="size-4 mr-2" />{inc.newIngreso}</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? inc.editTitle : inc.newTitle}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="persona">{inc.persona}</Label>
                  <select
                    id="persona"
                    value={personId}
                    onChange={(e) => setPersonId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                    required
                  >
                    <option value="" disabled>{inc.selectPersona}</option>
                    {people.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">{inc.monto}</Label>
                  <Input id="amount" type="number" step="0.01" min="0.01" placeholder={inc.montoPlaceholder} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{inc.concepto}</Label>
                  <Input id="description" placeholder={inc.conceptoPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catSelect">Categoría</Label>
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
                  <Label htmlFor="date">{inc.fecha}</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">{editing ? inc.guardarCambios : inc.guardar}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs border rounded-lg px-3 py-2 bg-muted/30 mb-4">
        <span><span className="text-muted-foreground">Total ingresado</span> <b className="text-green-600">{fmt(total)}</b></span>
        <span className="text-muted-foreground">·</span>
        <span><span className="text-muted-foreground">Cantidad</span> <b>{incomes.length}</b></span>
      </div>

      {incomes.length === 0 ? (
        <div className="border rounded-lg bg-background p-6 text-center">
          <p className="text-sm text-muted-foreground">{inc.empty}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-background">
          <div className="flex items-center justify-between px-3 py-1 border-b bg-muted/10">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ingresos</span>
          </div>
          <div className="text-sm">
            {incomes.map((inc) => (
              <div key={inc.id} className="flex items-center py-0.5 px-1.5 hover:bg-green-50/70 border-t border-border/50 first:border-t-0">
                <span className="truncate min-w-0">{inc.description || "Sin concepto"}</span>
                {inc.income_categories && (
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-1">· {inc.income_categories.name}</span>
                )}
                <span className="text-[10px] text-muted-foreground mx-1 shrink-0">·</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{inc.people?.name}</span>
                <span className="text-[10px] text-muted-foreground mx-1 shrink-0">·</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{new Date(inc.date).toLocaleDateString("es-CO")}</span>
                <span className="tabular-nums shrink-0 text-green-600 ml-auto font-semibold">+ {fmt(Number(inc.amount))}</span>
                <button className="text-blue-500 hover:text-blue-700 shrink-0 ml-1" onClick={() => openEdit(inc)}>
                  <Pencil className="size-3" />
                </button>
                <button className="text-red-400 hover:text-red-600 shrink-0 ml-0.5" onClick={() => handleDelete(inc.id)}>
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-1.5 py-0.5 border-t border-border/50 bg-green-100/30 text-sm">
            <span className="font-semibold">Total general</span>
            <span className="tabular-nums font-semibold text-green-600">{fmt(total)}</span>
          </div>
          <div className="border-t border-border/50">
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-full px-1.5 py-0.5 hover:bg-muted/30" onClick={openNew}>
              <Plus className="size-3.5" /> {inc.newIngreso}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
