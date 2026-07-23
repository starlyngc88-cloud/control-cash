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

import {
  getCommitments,
  createCommitment,
  updateCommitment,
  deleteCommitment,
  getCommitmentPayments,
  createCommitmentPayment,
  getBudgetTemplates,
  getBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
} from "@/lib/db"
import type { Commitment, CommitmentPayment, BudgetCategory } from "@/types"
import { Plus, Trash2, Pencil, ShieldCheck, ArrowDownCircle, ChevronDown, ChevronRight, List } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function CompromisosPage() {
  const [commitments, setCommitments] = useState<(Commitment & { budget_categories: Pick<BudgetCategory, "name"> | null })[]>([])
  const [paymentsMap, setPaymentsMap] = useState<Record<string, CommitmentPayment[]>>({})
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [templateId, setTemplateId] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Commitment | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedComm, setExpandedComm] = useState<Set<string>>(new Set())
  const { t, fmt } = useLanguage()
  const dict = t.compromisos

  const [name, setName] = useState("")
  const [descrip, setDescrip] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [currentBalance, setCurrentBalance] = useState("")
  const [commCategoryId, setCommCategoryId] = useState("")

  const [openPay, setOpenPay] = useState(false)
  const [payCommId, setPayCommId] = useState("")
  const [payCommName, setPayCommName] = useState("")
  const [payAmount, setPayAmount] = useState("")
  const [payCapital, setPayCapital] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catBudgeted, setCatBudgeted] = useState("")
  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)

  const load = async () => {
    const [comms, pays, templates] = await Promise.all([
      getCommitments(),
      getCommitmentPayments(),
      getBudgetTemplates(),
    ])
    const base = templates.find((t) => t.name.toLowerCase() === "modelo base")
    const tid = base?.id ?? ""
    setTemplateId(tid)
    const bc = tid ? await getBudgetCategories(tid) : []
    setBudgetCategories(bc)
    setCommitments(comms)

    const map: Record<string, CommitmentPayment[]> = {}
    for (const p of pays) {
      if (!map[p.commitment_id]) map[p.commitment_id] = []
      map[p.commitment_id].push(p)
    }
    setPaymentsMap(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleComm = (id: string) => {
    setExpandedComm((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openNew = () => {
    setEditing(null)
    setName("")
    setDescrip("")
    setTotalAmount("")
    setCurrentBalance("")
    setCommCategoryId("")
    setOpen(true)
  }

  const openEdit = (comm: Commitment) => {
    setEditing(comm)
    setName(comm.name)
    setDescrip(comm.description)
    setTotalAmount(String(comm.total_amount))
    setCurrentBalance(String(comm.current_balance))
    setCommCategoryId(comm.category_id ?? "")
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !totalAmount || !currentBalance) return
    const data = {
      name,
      description: descrip,
      total_amount: parseFloat(totalAmount),
      current_balance: parseFloat(currentBalance),
      category_id: commCategoryId || null,
    }
    if (editing) {
      await updateCommitment(editing.id, data)
    } else {
      await createCommitment(data)
    }
    setOpen(false)
    setEditing(null)
    setName("")
    setDescrip("")
    setTotalAmount("")
    setCurrentBalance("")
    setCommCategoryId("")
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(dict.deleteConfirm)) return
    await deleteCommitment(id)
    load()
  }

  const openPayDialog = (comm: Commitment & { budget_categories: Pick<BudgetCategory, "name"> | null }) => {
    setPayCommId(comm.id)
    setPayCommName(comm.name)
    setPayAmount("")
    setPayCapital("")
    setPayNotes("")
    setPayDate(new Date().toISOString().split("T")[0])
    setOpenPay(true)
  }

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payCommId || !payAmount || !payCapital) return
    await createCommitmentPayment({
      commitment_id: payCommId,
      amount: parseFloat(payAmount),
      capital_amount: parseFloat(payCapital),
      date: payDate,
      notes: payNotes,
    })
    setOpenPay(false)
    load()
  }

  const openNewCat = () => {
    setEditingCat(null)
    setCatName("")
    setCatBudgeted("")
    setOpenCat(true)
  }

  const openEditCat = (cat: BudgetCategory) => {
    setEditingCat(cat)
    setCatName(cat.name)
    setCatBudgeted(String(cat.budgeted))
    setOpenCat(true)
  }

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim() || !templateId) return
    if (editingCat) {
      await updateBudgetCategory(editingCat.id, { name: catName.trim(), budgeted: parseFloat(catBudgeted || "0"), parent_id: editingCat.parent_id })
    } else {
      await createBudgetCategory({ template_id: templateId, name: catName.trim(), budgeted: parseFloat(catBudgeted || "0") })
    }
    setOpenCat(false)
    setEditingCat(null)
    load()
  }

  const catDeleteExpenses = catToDelete
    ? commitments.filter((c) => c.category_id === catToDelete.id)
    : []

  const handleDeleteCat = (id: string) => {
    const cat = budgetCategories.find((c) => c.id === id)
    if (cat) setCatToDelete({ id: cat.id, name: cat.name })
  }

  const confirmDeleteCat = async () => {
    if (!catToDelete) return
    await deleteBudgetCategory(catToDelete.id)
    setCatToDelete(null)
    load()
  }

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const totalDeuda = commitments.reduce((s, c) => s + Number(c.current_balance), 0)
  const totalOriginal = commitments.reduce((s, c) => s + Number(c.total_amount), 0)

  const allExpanded = commitments.length > 0 && commitments.every((c) => expandedComm.has(c.id))

  return (
    <div className="-mx-6 -mt-6 p-6 min-h-[calc(100vh-3rem)] bg-gradient-to-b from-transparent to-muted/20">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{dict.title}</h2>
            <p className="text-sm text-muted-foreground">{dict.subtitle}</p>
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
                <div className="space-y-2">
                  <Label htmlFor="catBudgeted">Presupuestado</Label>
                  <Input id="catBudgeted" type="number" step="0.01" min="0" value={catBudgeted} onChange={(e) => setCatBudgeted(e.target.value)} />
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
                  ¿Eliminar la categoría <strong>{catToDelete?.name}</strong>? Se eliminará la referencia en compromisos y gastos asociados.
                </p>
                {catDeleteExpenses.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {catDeleteExpenses.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-muted/30">
                        <span>{c.name}</span>
                        <span className="font-semibold text-indigo-600">{fmt(Number(c.total_amount))}</span>
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
            <DialogTrigger render={(props) => <Button {...props} onClick={openNew}><Plus className="size-4 mr-2" />{dict.newTitle}</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? dict.editTitle : dict.newTitle}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{dict.nombre}</Label>
                  <Input id="name" placeholder={dict.nombrePlaceholder} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descrip">{dict.descripcion}</Label>
                  <Input id="descrip" value={descrip} onChange={(e) => setDescrip(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">{dict.montoTotal}</Label>
                  <Input id="totalAmount" type="number" step="0.01" min="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentBalance">{dict.saldoActual}</Label>
                  <Input id="currentBalance" type="number" step="0.01" min="0" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commCategory">{dict.rubro}</Label>
                  <select
                    id="commCategory"
                    value={commCategoryId}
                    onChange={(e) => setCommCategoryId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  >
                    <option value="">{dict.sinRubro}</option>
                    {budgetCategories.filter((c) => !c.parent_id).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full">{editing ? dict.guardarCambios : dict.guardar}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card title="Cantidad de compromisos financieros activos" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.totalCompromisos}</CardTitle>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{commitments.length}</div>
          </CardContent>
        </Card>
        <Card title="Suma del saldo pendiente de todos los compromisos" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.totalDeuda}</CardTitle>
            <ArrowDownCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{fmt(totalDeuda)}</div>
          </CardContent>
        </Card>
        <Card title="Porcentaje total de deuda pagada" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.progreso}</CardTitle>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOriginal > 0 ? Math.round((1 - totalDeuda / totalOriginal) * 100) : 0}%</div>
          </CardContent>
        </Card>
        <Card title="Total de pagos registrados" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.pagosRecientes}</CardTitle>
            <ArrowDownCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{Object.values(paymentsMap).reduce((s, pays) => s + pays.length, 0)}</div>
          </CardContent>
        </Card>
      </div>

      {commitments.length === 0 ? (
        <div className="border rounded-lg bg-background p-6 text-center">
          <p className="text-sm text-muted-foreground">{dict.empty}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-background">
          <div className="flex items-center justify-between px-3 py-1 border-b bg-muted/10">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Compromisos</span>
            <button
              onClick={() => {
                if (allExpanded) setExpandedComm(new Set())
                else setExpandedComm(new Set(commitments.map((c) => c.id)))
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {allExpanded ? "Contraer todo" : "Expandir todo"}
            </button>
          </div>
          <div className="text-sm">
            {commitments.map((comm) => {
              const isExpanded = expandedComm.has(comm.id)
              const pays = paymentsMap[comm.id] ?? []
              const progress = comm.total_amount > 0 ? Math.round((1 - Number(comm.current_balance) / Number(comm.total_amount)) * 100) : 0
              return (
                <div key={comm.id}>
                  <div className={`flex items-center py-0.5 px-1.5 transition-colors ${isExpanded ? "bg-indigo-100/50" : "hover:bg-indigo-100 bg-muted/5"} border-t border-border/50 first:border-t-0`}>
                    <button onClick={() => toggleComm(comm.id)} className="p-0.5 rounded hover:bg-accent text-gray-400 hover:text-gray-600 shrink-0">
                      {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                    <button className="text-blue-500 hover:text-blue-700 shrink-0 ml-0.5" onClick={() => openEdit(comm)}>
                      <Pencil className="size-3.5" />
                    </button>
                    <button className="text-red-400 hover:text-red-600 shrink-0 ml-0.5" onClick={() => handleDelete(comm.id)}>
                      <Trash2 className="size-3.5" />
                    </button>
                    <span className="font-medium truncate min-w-0">{comm.name}</span>
                    {comm.budget_categories && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-1">· {comm.budget_categories.name}</span>
                    )}
                    <span className="tabular-nums shrink-0 ml-auto font-semibold text-indigo-600">{fmt(Number(comm.current_balance))}</span>
                    <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden ml-2">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-1 shrink-0">{progress}%</span>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-dashed border-border/30">
                      {comm.description && (
                        <div className="flex items-center py-0.5 pl-8 pr-1.5 text-xs text-muted-foreground bg-muted/10">
                          {comm.description}
                        </div>
                      )}
                      <div className="flex items-center gap-1 py-0.5 pl-8 pr-1.5">
                        <Button size="sm" className="h-6 text-[10px]" onClick={() => openPayDialog(comm)}>
                          <ArrowDownCircle className="size-3 mr-1" />
                          {dict.pagar}
                        </Button>
                      </div>
                      {pays.length > 0 && (
                        <div className="pl-8 pr-1.5 pb-0.5">
                          <div className="border rounded divide-y">
                            {pays.map((p) => (
                              <div key={p.id} className="flex items-center justify-between px-2 py-0.5 text-[11px]">
                                <span className="text-muted-foreground">{new Date(p.date).toLocaleDateString("es-CO")}{p.notes ? ` · ${p.notes}` : ""}</span>
                                <span className="tabular-nums">{fmt(p.amount)} <span className="text-green-600 font-medium">-{fmt(p.capital_amount)}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between px-1.5 py-0.5 border-t border-border/50 bg-indigo-100/30 text-sm">
            <span className="font-semibold">{dict.totalDeuda}</span>
            <span className="tabular-nums font-semibold text-indigo-600">{fmt(totalDeuda)}</span>
          </div>
          <div className="border-t border-border/50">
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-full px-1.5 py-0.5 hover:bg-muted/30" onClick={openNew}>
              <Plus className="size-3.5" /> {dict.newTitle}
            </button>
          </div>
        </div>
      )}

      <Dialog open={openPay} onOpenChange={setOpenPay}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dict.pagar}: {payCommName}</DialogTitle></DialogHeader>
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payAmount">{dict.pagoMonto}</Label>
              <Input id="payAmount" type="number" step="0.01" min="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payCapital">{dict.pagoCapital}</Label>
              <Input id="payCapital" type="number" step="0.01" min="0.01" value={payCapital} onChange={(e) => setPayCapital(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payNotes">{dict.pagoNotas}</Label>
              <Input id="payNotes" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payDate">{dict.pagoFecha}</Label>
              <Input id="payDate" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">{dict.pagar}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
