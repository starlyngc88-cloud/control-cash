"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Plus, Trash2, Pencil, ShieldCheck, ArrowDownCircle, ChevronDown, ChevronRight, List, Search } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { friendlyError } from "@/lib/errors"
import { useCashflowFilter } from "@/components/contexts/CashflowFilterContext"
import { useHeaderActions } from "@/components/HeaderActionsContext"
import { Tooltip } from "@/components/ui/tooltip"

export default function CompromisosPage() {
  const [commitments, setCommitments] = useState<(Commitment & { budget_categories: Pick<BudgetCategory, "name"> | null })[]>([])
  const [paymentsMap, setPaymentsMap] = useState<Record<string, CommitmentPayment[]>>({})
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [templateId, setTemplateId] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Commitment | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedComm, setExpandedComm] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { t, fmt } = useLanguage()
  const dict = t.compromisos
  const { startDate, endDate } = useCashflowFilter()

  const [search, setSearch] = useState("")

  const filteredPayments = useMemo(() => {
    if (!startDate || !endDate) return paymentsMap
    const filtered: Record<string, CommitmentPayment[]> = {}
    for (const [id, payments] of Object.entries(paymentsMap)) {
      filtered[id] = payments.filter((p) => p.date >= startDate && p.date <= endDate)
    }
    return filtered
  }, [paymentsMap, startDate, endDate])

  const filtered = useMemo(() => {
    if (!search) return commitments
    const q = search.toLowerCase()
    return commitments.filter((c) => c.name.toLowerCase().includes(q) || (c.budget_categories?.name ?? "").toLowerCase().includes(q))
  }, [commitments, search])

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

  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false)
  const headerDropdownRef = useRef<HTMLDivElement>(null)
  const { setActions } = useHeaderActions()

  const openNew = () => {
    setEditing(null)
    setName("")
    setDescrip("")
    setTotalAmount("")
    setCurrentBalance("")
    setCommCategoryId("")
    setOpen(true)
  }

  const openNewCat = () => {
    setEditingCat(null)
    setCatName("")
    setCatBudgeted("")
    setOpenCat(true)
  }

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
                onClick={() => { openNewCat(); setHeaderDropdownOpen(false) }}
              >
                <List className="size-4 text-rose-500" />
                Nueva categoría
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                onClick={() => { openNew(); setHeaderDropdownOpen(false) }}
              >
                <ShieldCheck className="size-4 text-rose-500" />
                Nuevo compromiso
              </button>
            </div>
          </>
        )}
      </div>
    )
    return () => setActions(null)
  }, [headerDropdownOpen, setActions])

  const load = useCallback(async () => {
    try {
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
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void (async () => { await load() })() }, [load])

  const toggleComm = (id: string) => {
    setExpandedComm((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
    setSubmitting(true)
    try {
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
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(dict.deleteConfirm)) return
    setSubmitting(true)
    try {
      await deleteCommitment(id)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
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
    setSubmitting(true)
    try {
      await createCommitmentPayment({
        commitment_id: payCommId,
        amount: parseFloat(payAmount),
        capital_amount: parseFloat(payCapital),
        date: payDate,
        notes: payNotes,
      })
      setOpenPay(false)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim() || !templateId) return
    setSubmitting(true)
    try {
      if (editingCat) {
        await updateBudgetCategory(editingCat.id, { name: catName.trim(), budgeted: parseFloat(catBudgeted || "0"), parent_id: editingCat.parent_id })
      } else {
        await createBudgetCategory({ template_id: templateId, name: catName.trim(), budgeted: parseFloat(catBudgeted || "0") })
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

  const catDeleteExpenses = catToDelete
    ? commitments.filter((c) => c.category_id === catToDelete.id)
    : []

  const confirmDeleteCat = async () => {
    if (!catToDelete) return
    setSubmitting(true)
    try {
      await deleteBudgetCategory(catToDelete.id)
      setCatToDelete(null)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const totalDeuda = commitments.reduce((s, c) => s + Number(c.current_balance), 0)
  const totalOriginal = commitments.reduce((s, c) => s + Number(c.total_amount), 0)

  const allExpanded = commitments.length > 0 && commitments.every((c) => expandedComm.has(c.id))

  return (
    <div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}
      <Dialog open={openCat} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCat(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Las categorías organizan tus compromisos.</p>
          </DialogHeader>
          <form onSubmit={handleCatSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-sm font-medium text-slate-700">Nombre</Label>
                <Input id="catName" value={catName} onChange={(e) => setCatName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="catBudgeted" className="text-sm font-medium text-slate-700">Presupuestado</Label>
                <Input id="catBudgeted" type="number" step="0.01" min="0" value={catBudgeted} onChange={(e) => setCatBudgeted(e.target.value)} />
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
            {catDeleteExpenses.length > 0 && (
              <p className="mt-1 text-xs text-rose-500">Se eliminará la referencia en compromisos y gastos asociados.</p>
            )}
          </div>
          {catDeleteExpenses.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-2">
              {catDeleteExpenses.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm px-3 py-1.5 rounded hover:bg-slate-50">
                  <span className="text-slate-700">{c.name}</span>
                  <span className="font-semibold text-rose-600 tabular-nums">{fmt(Number(c.total_amount))}</span>
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
          <DialogTitle>{editing ? dict.editTitle : dict.newTitle}</DialogTitle>
          <p className="text-xs text-slate-500 mt-1">Registrá los detalles del compromiso.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">{dict.nombre}</Label>
              <Input id="name" placeholder={dict.nombrePlaceholder} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descrip" className="text-sm font-medium text-slate-700">{dict.descripcion}</Label>
              <Input id="descrip" value={descrip} onChange={(e) => setDescrip(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="totalAmount" className="text-sm font-medium text-slate-700">{dict.montoTotal}</Label>
                <Input id="totalAmount" type="number" step="0.01" min="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currentBalance" className="text-sm font-medium text-slate-700">{dict.saldoActual}</Label>
                <Input id="currentBalance" type="number" step="0.01" min="0" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commCategory" className="text-sm font-medium text-slate-700">{dict.rubro}</Label>
              <select
                id="commCategory"
                value={commCategoryId}
                onChange={(e) => setCommCategoryId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              >
                <option value="">{dict.sinRubro}</option>
                {budgetCategories.filter((c) => !c.parent_id).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
            <Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : editing ? dict.guardarCambios : dict.guardar}</Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>

      <div className="grid gap-2 md:grid-cols-4 mb-3">
        <Tooltip content="Cantidad de compromisos (créditos/deudas) registrados" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{dict.totalCompromisos}</p>
                <h3 className="text-lg font-bold text-slate-800">{commitments.length}</h3>
              </div>
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                <ShieldCheck className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>
        <Tooltip content="Suma de saldos pendientes de todos los compromisos" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{dict.totalDeuda}</p>
                <h3 className="text-lg font-bold text-rose-600">{fmt(totalDeuda)}</h3>
              </div>
              <div className="p-1.5 bg-red-50 rounded-lg text-red-600">
                <ArrowDownCircle className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>
        <Tooltip content="Porcentaje de deuda ya pagada" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{dict.progreso}</p>
                <h3 className="text-lg font-bold text-slate-800">{totalOriginal > 0 ? Math.round((1 - totalDeuda / totalOriginal) * 100) : 0}%</h3>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg text-slate-600">
                <ShieldCheck className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>
        <Tooltip content="Cantidad de pagos registrados a compromisos" className="h-full">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-0.5">{dict.pagosRecientes}</p>
                <h3 className="text-lg font-bold text-slate-800">{Object.values(filteredPayments).reduce((s, pays) => s + pays.length, 0)}</h3>
              </div>
              <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
                <ArrowDownCircle className="size-3.5" />
              </div>
            </div>
          </div>
        </Tooltip>
      </div>

      <div className="relative flex-1 max-w-xs mb-3">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm text-center">
          <p className="text-xs text-slate-500">{dict.empty}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Compromisos</span>
            <button
              onClick={() => {
                if (allExpanded) setExpandedComm(new Set())
                else setExpandedComm(new Set(commitments.map((c) => c.id)))
              }}
              className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
            >
              {allExpanded ? "Contraer todo" : "Expandir todo"}
            </button>
          </div>
          <div>
            {filtered.map((comm) => {
              const isExpanded = expandedComm.has(comm.id)
              const pays = filteredPayments[comm.id] ?? []
              const progress = comm.total_amount > 0 ? Math.round((1 - Number(comm.current_balance) / Number(comm.total_amount)) * 100) : 0
              return (
                <div key={comm.id}>
                  <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <button onClick={() => toggleComm(comm.id)} className="text-slate-400 hover:text-slate-600 mr-1.5">
                      {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{comm.name}</span>
                    {comm.budget_categories && (
                      <span className="text-[10px] text-slate-400 ml-1.5">· {comm.budget_categories.name}</span>
                    )}
                    <span className="ml-auto text-xs font-semibold text-rose-600 tabular-nums">{fmt(Number(comm.current_balance))}</span>
                    <div className="w-10 h-1 rounded-full bg-slate-200 overflow-hidden ml-2">
                      <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 ml-1 shrink-0">{progress}%</span>
                    <div className="flex items-center gap-0.5 ml-2">
                      <button className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5" onClick={() => openEdit(comm)}>
                        <Pencil className="size-3" />
                      </button>
                      <button className="text-slate-400 hover:text-rose-600 transition-colors p-0.5" onClick={() => handleDelete(comm.id)}>
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-white border-b border-slate-100">
                      {comm.description && (
                        <div className="px-5 py-1.5 text-[10px] text-slate-500 bg-slate-50/50 border-b border-slate-100">
                          {comm.description}
                        </div>
                      )}
                      <div className="px-5 py-2 flex items-center gap-1.5">
                        <button className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors" onClick={() => openPayDialog(comm)}>
                          <ArrowDownCircle className="size-3" />
                          {dict.pagar}
                        </button>
                      </div>
                      {pays.length > 0 && (
                        <div className="px-5 pb-2 space-y-0.5">
                          {pays.map((p) => (
                            <div key={p.id} className="flex items-center justify-between px-2.5 py-1 text-[10px] bg-slate-50 rounded-lg">
                              <span className="text-slate-500">{new Date(p.date).toLocaleDateString("es-CO")}{p.notes ? ` · ${p.notes}` : ""}</span>
                              <span className="tabular-nums font-medium text-rose-600">{fmt(p.amount)} <span className="text-rose-600 font-medium">-{fmt(p.capital_amount)}</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="bg-white px-4 py-2.5 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-rose-600 font-medium">Total: {fmt(totalDeuda)}</span>
            <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors" onClick={openNew}>
              <Plus className="size-3" /> {dict.newTitle}
            </button>
          </div>
        </div>
      )}

      <Dialog open={openPay} onOpenChange={setOpenPay}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dict.pagar}: {payCommName}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Registrá un pago a este compromiso.</p>
          </DialogHeader>
          <form onSubmit={handlePaySubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="payAmount" className="text-sm font-medium text-slate-700">{dict.pagoMonto}</Label>
                  <Input id="payAmount" type="number" step="0.01" min="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payCapital" className="text-sm font-medium text-slate-700">{dict.pagoCapital}</Label>
                  <Input id="payCapital" type="number" step="0.01" min="0.01" value={payCapital} onChange={(e) => setPayCapital(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payNotes" className="text-sm font-medium text-slate-700">{dict.pagoNotas}</Label>
                <Input id="payNotes" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payDate" className="text-sm font-medium text-slate-700">{dict.pagoFecha}</Label>
                <Input id="payDate" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" disabled={submitting}>{submitting ? "Procesando..." : dict.pagar}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
