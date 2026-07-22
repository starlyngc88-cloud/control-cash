"use client"

import { useEffect, useState } from "react"
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
import { getExpenses, createExpense, updateExpense, deleteExpense, getPeople, getAllBudgetCategories } from "@/lib/db"
import type { Person, Expense, BudgetCategory, BudgetTemplate } from "@/types"
import { Plus, Trash2, Pencil, ArrowUpCircle } from "lucide-react"

export default function GastosPage() {
  const [expenses, setExpenses] = useState<(Expense & { people: Pick<Person, "name"> | null; budget_categories: Pick<BudgetCategory, "id" | "name" | "template_id" | "budgeted"> | null })[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)

  const [personId, setPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [budgetCatId, setBudgetCatId] = useState("")

  const [budgetCategories, setBudgetCategories] = useState<(BudgetCategory & { budget_templates: Pick<BudgetTemplate, "name"> })[]>([])

  const load = async () => {
    const [e, p, bc] = await Promise.all([getExpenses(), getPeople(), getAllBudgetCategories()])
    setExpenses(e)
    setPeople(p)
    setBudgetCategories(bc)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setPersonId("")
    setAmount("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setBudgetCatId("")
    setOpen(true)
  }

  const openEdit = (exp: Expense & { people: Pick<Person, "name"> | null; budget_categories: any }) => {
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
    if (!personId || !amount || !description) return
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
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return
    await deleteExpense(id)
    load()
  }

  if (loading) return <p className="text-muted-foreground">Cargando...</p>

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30">
            <ArrowUpCircle className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gastos</h2>
            <p className="text-sm text-muted-foreground">Lo que salió</p>
          </div>
        </div>
        <Dialog key={editing?.id ?? 'new'} open={open} onOpenChange={(v) => { if (!v) setEditing(null); setOpen(v) }}>
          <DialogTrigger render={(props) => <Button {...props} onClick={openNew}><Plus className="size-4 mr-2" />Nuevo gasto</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar gasto" : "Nuevo gasto"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="persona">Persona</Label>
                <select
                  id="persona"
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  required
                >
                  <option value="" disabled>Seleccionar persona</option>
                  {people.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input id="amount" type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Concepto</Label>
                <Input id="description" placeholder="Ej: Mercado, gasolina, etc." value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Rubro (opcional)</Label>
                <select
                  id="category"
                  value={budgetCatId}
                  onChange={(e) => setBudgetCatId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                >
                  <option value="">Sin rubro</option>
                  {budgetCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name} ({cat.budget_templates?.name})</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">{editing ? "Guardar cambios" : "Guardar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Total: ${total.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay gastos registrados.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:shadow-sm hover:border-border/80">
                  <div>
                    <p className="text-sm font-medium">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.people?.name} · {new Date(exp.date).toLocaleDateString("es-CO")}
                      {exp.budget_categories && <> · <span className="text-violet-500">{exp.budget_categories.name}</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-red-600">-${Number(exp.amount).toLocaleString("es-CO", { minimumFractionDigits: 2 })}</span>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(exp)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(exp.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
