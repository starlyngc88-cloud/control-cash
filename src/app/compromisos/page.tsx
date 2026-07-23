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
  getCommitments,
  createCommitment,
  updateCommitment,
  deleteCommitment,
  getCommitmentPayments,
  createCommitmentPayment,
  getBudgetTemplates,
  getBudgetCategories,
} from "@/lib/db"
import type { Commitment, CommitmentPayment, BudgetCategory } from "@/types"
import { Plus, Trash2, Pencil, ShieldCheck, ArrowDownCircle, ChevronDown, ChevronRight } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function CompromisosPage() {
  const [commitments, setCommitments] = useState<(Commitment & { budget_categories: Pick<BudgetCategory, "name"> | null })[]>([])
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState(true)
  const { t, fmt } = useLanguage()
  const dict = t.compromisos

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Commitment | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [currentBalance, setCurrentBalance] = useState("")
  const [categoryId, setCategoryId] = useState("")

  const [openPay, setOpenPay] = useState(false)
  const [payCommId, setPayCommId] = useState("")
  const [payCommName, setPayCommName] = useState("")
  const [payAmount, setPayAmount] = useState("")
  const [payCapital, setPayCapital] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])

  const [paymentsMap, setPaymentsMap] = useState<Record<string, CommitmentPayment[]>>({})
  const [expandedComm, setExpandedComm] = useState<Set<string>>(new Set())

  const load = async () => {
    const [comms, templates] = await Promise.all([getCommitments(), getBudgetTemplates()])
    const base = templates.find((t) => t.name.toLowerCase() === "modelo base")
    const cats = base ? await getBudgetCategories(base.id) : []
    setCommitments(comms)
    setBudgetCategories(cats)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const loadPayments = async (commId: string) => {
    const pays = await getCommitmentPayments(commId)
    setPaymentsMap((prev) => ({ ...prev, [commId]: pays }))
  }

  const toggleComm = (id: string) => {
    setExpandedComm((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (!paymentsMap[id]) loadPayments(id)
      }
      return next
    })
  }

  const totalDeuda = useMemo(() => commitments.reduce((s, c) => s + Number(c.current_balance), 0), [commitments])
  const totalOriginal = useMemo(() => commitments.reduce((s, c) => s + Number(c.total_amount), 0), [commitments])

  const openNew = () => {
    setEditing(null)
    setName("")
    setDescription("")
    setTotalAmount("")
    setCurrentBalance("")
    setCategoryId("")
    setOpen(true)
  }

  const openEdit = (comm: Commitment) => {
    setEditing(comm)
    setName(comm.name)
    setDescription(comm.description)
    setTotalAmount(String(comm.total_amount))
    setCurrentBalance(String(comm.current_balance))
    setCategoryId(comm.category_id ?? "")
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !totalAmount || !currentBalance) return
    const data = {
      name,
      description,
      total_amount: parseFloat(totalAmount),
      current_balance: parseFloat(currentBalance),
      category_id: categoryId || null,
    }
    if (editing) {
      await updateCommitment(editing.id, data)
    } else {
      await createCommitment(data)
    }
    setOpen(false)
    setEditing(null)
    setName("")
    setDescription("")
    setTotalAmount("")
    setCurrentBalance("")
    setCategoryId("")
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
    const capital = parseFloat(payCapital)
    await createCommitmentPayment({
      commitment_id: payCommId,
      amount: parseFloat(payAmount),
      capital_amount: capital,
      date: payDate,
      notes: payNotes,
    })
    setOpenPay(false)
    setPayCommId("")
    setPayCommName("")
    setPayAmount("")
    setPayCapital("")
    setPayNotes("")
    load()
  }

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{dict.title}</h2>
            <p className="text-sm text-muted-foreground">{dict.subtitle}</p>
          </div>
        </div>
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
                <Label htmlFor="description">{dict.descripcion}</Label>
                <Input id="description" placeholder={dict.descripcionPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">{dict.montoTotal}</Label>
                  <Input id="totalAmount" type="number" step="0.01" min="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentBalance">{dict.saldoActual}</Label>
                  <Input id="currentBalance" type="number" step="0.01" min="0" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="catSelect">{dict.rubro}</Label>
                <select
                  id="catSelect"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                >
                  <option value="">{dict.sinRubro}</option>
                  {budgetCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">{editing ? dict.guardarCambios : dict.guardar}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.totalCompromisos}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">
              <ShieldCheck className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600">{commitments.length}</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.totalDeuda}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
              <ArrowDownCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{fmt(totalDeuda)}</p>
            <p className="text-xs text-muted-foreground">{dict.progreso}: {totalOriginal > 0 ? Math.round((1 - totalDeuda / totalOriginal) * 100) : 0}%</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{dict.pagosRecientes}</CardTitle>
            <div className="flex items-center justify-center size-8 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
              <ArrowDownCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {Object.values(paymentsMap).reduce((s, pays) => s + pays.length, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {commitments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{dict.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {commitments.map((comm) => {
            const isExpanded = expandedComm.has(comm.id)
            const pays = paymentsMap[comm.id] ?? []
            const progress = comm.total_amount > 0 ? Math.round((1 - Number(comm.current_balance) / Number(comm.total_amount)) * 100) : 0
            return (
              <Card key={comm.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b cursor-pointer select-none hover:bg-muted/40 transition-colors"
                  onClick={() => toggleComm(comm.id)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isExpanded ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
                    <span className="text-sm font-semibold truncate">{comm.name}</span>
                    {comm.budget_categories && (
                      <span className="text-xs text-muted-foreground shrink-0">· {comm.budget_categories.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-indigo-600">{fmt(Number(comm.current_balance))}</p>
                      <p className="text-[10px] text-muted-foreground">{progress}%</p>
                    </div>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <CardContent className="p-3 space-y-3">
                    {comm.description && (
                      <p className="text-xs text-muted-foreground">{comm.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="h-8 text-xs" onClick={() => openPayDialog(comm)}>
                        <ArrowDownCircle className="size-3.5 mr-1" />
                        {dict.pagar}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openEdit(comm)}>
                        <Pencil className="size-3.5 mr-1" />
                        {t.common.saveChanges}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(comm.id)}>
                        <Trash2 className="size-3.5 mr-1" />
                        {t.common.delete}
                      </Button>
                    </div>
                    {pays.length > 0 && (
                      <div className="border rounded-lg divide-y">
                        <p className="text-[11px] font-medium text-muted-foreground px-2 py-1">{dict.pagosRecientes}</p>
                        {pays.map((p) => (
                          <div key={p.id} className="flex items-center justify-between px-2 py-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">{new Date(p.date).toLocaleDateString("es-CO")}</span>
                              {p.notes && <span className="text-muted-foreground"> · {p.notes}</span>}
                            </div>
                            <div className="flex gap-3 tabular-nums">
                              <span>{fmt(p.amount)}</span>
                              <span className="text-green-600 font-medium">-{fmt(p.capital_amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
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
