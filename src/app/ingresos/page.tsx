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

import { getIncomes, createIncome, updateIncome, deleteIncome, getPeople } from "@/lib/db"
import type { Person, Income } from "@/types"
import { Plus, Trash2, Pencil, ArrowDownCircle } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function IngresosPage() {
  const [incomes, setIncomes] = useState<(Income & { people: Pick<Person, "name"> | null })[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()
  const inc = t.ingresos

  const [personId, setPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])

  const load = async () => {
    const [i, p] = await Promise.all([getIncomes(), getPeople()])
    setIncomes(i)
    setPeople(p)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setPersonId("")
    setAmount("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setOpen(true)
  }

  const openEdit = (inc: Income & { people: Pick<Person, "name"> | null }) => {
    setEditing(inc)
    setPersonId(inc.person_id)
    setAmount(String(inc.amount))
    setDescription(inc.description)
    setDate(inc.date)
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId || !amount || !description) return
    const data = { person_id: personId, amount: parseFloat(amount), description, date }
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
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(inc.deleteConfirm)) return
    await deleteIncome(id)
    load()
  }

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30">
            <ArrowDownCircle className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{inc.title}</h2>
            <p className="text-sm text-muted-foreground">{inc.subtitle}</p>
          </div>
        </div>
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
                <Input id="description" placeholder={inc.conceptoPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} required />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{inc.total} ${total.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</CardTitle>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{inc.empty}</p>
          ) : (
            <div className="space-y-2">
              {incomes.map((inc) => (
                <div key={inc.id} className="flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:shadow-sm hover:border-border/80">
                  <div>
                    <p className="text-sm font-medium">{inc.description}</p>
                    <p className="text-xs text-muted-foreground">{inc.people?.name} · {new Date(inc.date).toLocaleDateString("es-CO")}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-green-600">+${Number(inc.amount).toLocaleString("es-CO", { minimumFractionDigits: 2 })}</span>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(inc)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(inc.id)}>
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
