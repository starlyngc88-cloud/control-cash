"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
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
  deleteCommitmentPayment,
  getBudgetTemplates,
  getBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  getAmortizationSchedules,
  upsertAmortizationSchedules,
  deleteAmortizationSchedules,
  markAmortizationPaid,
  calculateFrenchAmortization,
  calculateAmortizationFromCuota,
  createExpense,
  getPeople,
} from "@/lib/db"
import type { Commitment, CommitmentPayment, BudgetCategory, AmortizationSchedule } from "@/types"
import { Plus, Trash2, Pencil, ShieldCheck, ArrowDownCircle, ChevronDown, ChevronRight, List, Search, Upload, Calculator, FileSpreadsheet, X, BarChart3 } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { friendlyError } from "@/lib/errors"
import { useHeaderActions } from "@/components/HeaderActionsContext"
import { Tooltip } from "@/components/ui/tooltip"

export default function CompromisosPage() {
  const [commitments, setCommitments] = useState<(Commitment & { budget_categories: Pick<BudgetCategory, "name"> | null })[]>([])
  const [paymentsMap, setPaymentsMap] = useState<Record<string, CommitmentPayment[]>>({})
  const [schedulesMap, setSchedulesMap] = useState<Record<string, AmortizationSchedule[]>>({})
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [templateId, setTemplateId] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Commitment | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedComm, setExpandedComm] = useState<Set<string>>(new Set())
  const [schedulePreviewId, setSchedulePreviewId] = useState<string | null>(null)
  const [selectedCommId, setSelectedCommId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { t, fmt } = useLanguage()
  const dict = t.compromisos

  const [search, setSearch] = useState("")

  const filteredPayments = useMemo(() => paymentsMap, [paymentsMap])

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
  const [payCommBalance, setPayCommBalance] = useState(0)
  const [payCommTotal, setPayCommTotal] = useState(0)
  const [payAmount, setPayAmount] = useState("")
  const [payCapital, setPayCapital] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null)
  const [catName, setCatName] = useState("")
  const [catBudgeted, setCatBudgeted] = useState("")
  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)

  const [openSchedule, setOpenSchedule] = useState(false)
  const [scheduleComm, setScheduleComm] = useState<Commitment | null>(null)
  const [scheduleRows, setScheduleRows] = useState<{ payment_date: string; cuota: number; capital: number; interest: number; fees: number; remaining_balance: number }[]>([])
  const [scheduleInput, setScheduleInput] = useState("")
  const [openCalc, setOpenCalc] = useState(false)
  const [calcPrincipal, setCalcPrincipal] = useState("")
  const [calcCuota, setCalcCuota] = useState("")
  const [calcTerm, setCalcTerm] = useState("")
  const [calcFees, setCalcFees] = useState("")
  const [calcStart, setCalcStart] = useState(new Date().toISOString().split("T")[0])
  const [people, setPeople] = useState<{ id: string; name: string }[]>([])
  const [payPersonId, setPayPersonId] = useState("")

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
      const [comms, pays, templates, ppl] = await Promise.all([
        getCommitments(),
        getCommitmentPayments(),
        getBudgetTemplates(),
        getPeople(),
      ])
      const base = templates.find((t) => t.name.toLowerCase() === "modelo base")
      const tid = base?.id ?? ""
      setTemplateId(tid)
      const bc = tid ? await getBudgetCategories(tid) : []
      setBudgetCategories(bc)
      setCommitments(comms)
      setPeople(ppl.map((p) => ({ id: p.id, name: p.name })))
      if (ppl.length === 1 && !payPersonId) setPayPersonId(ppl[0].id)

      const map: Record<string, CommitmentPayment[]> = {}
      for (const p of pays) {
        if (!map[p.commitment_id]) map[p.commitment_id] = []
        map[p.commitment_id].push(p)
      }
      setPaymentsMap(map)

      const schedMap: Record<string, AmortizationSchedule[]> = {}
      const schedResults = await Promise.all(comms.map((c) => getAmortizationSchedules(c.id).catch(() => [])))
      comms.forEach((c, i) => { schedMap[c.id] = schedResults[i] })
      setSchedulesMap(schedMap)
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
      await deleteAmortizationSchedules(id)
      await deleteCommitment(id)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePayment = async (payment: CommitmentPayment) => {
    if (!confirm(`¿Eliminar el pago del ${new Date(payment.date).toLocaleDateString("es-CO")}?`)) return
    setSubmitting(true)
    try {
      await deleteCommitmentPayment(payment.id)
      const { data: comm } = await supabase.from("commitments").select("current_balance").eq("id", payment.commitment_id).single()
      const newBalance = Number(comm?.current_balance ?? 0) + Number(payment.capital_amount)
      await supabase.from("commitments").update({ current_balance: newBalance }).eq("id", payment.commitment_id)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkSchedulePaid = async (scheduleId: string) => {
    setSubmitting(true)
    try {
      await markAmortizationPaid(scheduleId)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const openPayDialog = async (comm: Commitment & { budget_categories: Pick<BudgetCategory, "name"> | null }) => {
    setPayCommId(comm.id)
    setPayCommName(comm.name)
    setPayCommBalance(Number(comm.current_balance))
    setPayCommTotal(Number(comm.total_amount))
    setPayNotes("")
    setPayDate(new Date().toISOString().split("T")[0])

    try {
      const schedules = await getAmortizationSchedules(comm.id)
      const unpaid = schedules.filter((s) => !s.is_paid).sort((a, b) => a.payment_date.localeCompare(b.payment_date))
      if (unpaid.length > 0) {
        const next = unpaid[0]
        setPayAmount(String(next.cuota + next.fees))
        setPayCapital(String(next.capital))
        setPayDate(next.payment_date)
      } else {
        setPayAmount("")
        setPayCapital("")
      }
    } catch {
      setPayAmount("")
      setPayCapital("")
    }
    setOpenPay(true)
  }

  const openScheduleDialog = async (comm: Commitment) => {
    setScheduleComm(comm)
    try {
      const existing = await getAmortizationSchedules(comm.id)
      if (existing.length > 0) {
        setScheduleRows(existing.map((s) => ({
          payment_date: s.payment_date,
          cuota: s.cuota,
          capital: s.capital,
          interest: s.interest,
          fees: s.fees,
          remaining_balance: s.remaining_balance,
        })))
      } else {
        setScheduleRows([])
      }
    } catch {
      setScheduleRows([])
    }
    setScheduleInput("")
    setOpenSchedule(true)
  }

  const parsePastedSchedule = (text: string) => {
    const lines = text.trim().split("\n").filter((l) => l.trim())
    const rows: typeof scheduleRows = []
    for (const line of lines) {
      const cells = line.split(/[\t;,|]+/).map((c) => c.trim().replace(/[^\d.,\-]/g, "").replace(",", "."))
      if (cells.length >= 4) {
        const dateStr = line.split(/[\t;,|]+/)[0]?.trim()
        const dateMatch = dateStr?.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/)
        const payment_date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : ""
        if (!payment_date) continue
        const nums = cells.filter((c) => c && !isNaN(parseFloat(c))).map(Number)
        if (nums.length >= 3) {
          rows.push({
            payment_date,
            cuota: nums[0] || 0,
            capital: nums[1] || 0,
            interest: nums[2] || 0,
            fees: nums[3] || 0,
            remaining_balance: nums[4] || 0,
          })
        }
      }
    }
    return rows
  }

  const handleSchedulePaste = () => {
    const parsed = parsePastedSchedule(scheduleInput)
    if (parsed.length > 0) setScheduleRows(parsed)
    else setError("No se pudieron parsear las filas. Formato: fecha \\t cuota \\t capital \\t interés \\t gastos \\t saldo")
  }

  const handleScheduleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const XLSX = await import("xlsx")
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet)
      const rows: typeof scheduleRows = []
      for (const row of json) {
        const vals = Object.values(row)
        const dateStr = String(vals[0] ?? "")
        const dateMatch = dateStr.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/)
        const payment_date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : ""
        if (!payment_date) continue
        const nums = vals.slice(1).map((v) => Number(v) || 0).filter((n) => n >= 0)
        if (nums.length >= 3) {
          rows.push({
            payment_date,
            cuota: nums[0],
            capital: nums[1],
            interest: nums[2],
            fees: nums[3] || 0,
            remaining_balance: nums[4] || 0,
          })
        }
      }
      if (rows.length > 0) setScheduleRows(rows)
      else setError("No se encontraron filas válidas en el archivo Excel")
    } catch {
      setError("Error al leer el archivo Excel")
    }
    e.target.value = ""
  }

  const parseNum = (val: string) => parseFloat(val.replace(/[^0-9.,-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")) || 0

  const handleCalcGenerate = () => {
    const principal = parseNum(calcPrincipal)
    const cuota = parseNum(calcCuota)
    const fees = parseNum(calcFees)
    const term = parseInt(calcTerm.replace(/[^0-9]/g, ""))
    if (!principal || !cuota || !term) return
    const rows = calculateAmortizationFromCuota({ principal, monthlyCuota: cuota, fees, termMonths: term, startDate: calcStart })
    setScheduleRows(rows)
    setOpenCalc(false)
  }

  const handleSaveSchedule = async () => {
    if (!scheduleComm || scheduleRows.length === 0) return
    setSubmitting(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const rows = scheduleRows.map((r) => ({
        commitment_id: scheduleComm.id,
        payment_date: r.payment_date,
        cuota: r.cuota,
        capital: r.capital,
        interest: r.interest,
        fees: r.fees,
        remaining_balance: r.remaining_balance,
        is_paid: r.payment_date < today,
      }))
      await deleteAmortizationSchedules(scheduleComm.id)
      await upsertAmortizationSchedules(rows)
      setOpenSchedule(false)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const updateScheduleRow = (idx: number, field: string, value: string) => {
    setScheduleRows((prev) => {
      const next = [...prev]
      const numVal = field === "payment_date" ? value : parseFloat(value) || 0
      next[idx] = { ...next[idx], [field]: numVal }
      return next
    })
  }

  const addScheduleRow = () => {
    setScheduleRows((prev) => [...prev, { payment_date: "", cuota: 0, capital: 0, interest: 0, fees: 0, remaining_balance: 0 }])
  }

  const removeScheduleRow = (idx: number) => {
    setScheduleRows((prev) => prev.filter((_, i) => i !== idx))
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

      const comm = commitments.find((c) => c.id === payCommId)
      if (comm?.category_id && payPersonId) {
        try {
          await createExpense({
            person_id: payPersonId,
            amount: parseFloat(payAmount),
            description: `Pago ${comm.name}`,
            date: payDate,
            budget_category_id: comm.category_id,
          })
        } catch { /* expense creation is non-critical */ }
      }

      try {
        const schedules = await getAmortizationSchedules(payCommId)
        const match = schedules.find((s) => s.payment_date === payDate && !s.is_paid)
        if (match) await markAmortizationPaid(match.id)
      } catch { /* schedule marking is non-critical */ }

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
                  <div onClick={() => toggleComm(comm.id)} className={`flex items-center px-4 py-2.5 border-b border-slate-200 cursor-pointer transition-colors ${selectedCommId === comm.id ? "bg-indigo-50 hover:bg-indigo-100" : "bg-slate-50 hover:bg-slate-100"}`}>
                    <span className="text-slate-400 mr-1.5 shrink-0">
                      {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedCommId === comm.id}
                      onChange={(e) => { e.stopPropagation(); setSelectedCommId(selectedCommId === comm.id ? null : comm.id) }}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-indigo-600 rounded mr-2 shrink-0 size-3.5"
                    />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{comm.name}</span>
                    {comm.budget_categories && (
                      <span className="text-[10px] text-slate-400 ml-1.5">· {comm.budget_categories.name}</span>
                    )}
                    <span className="text-[10px] text-slate-400 tabular-nums line-through ml-auto">{fmt(Number(comm.total_amount))}</span>
                    <span className="text-xs font-semibold text-rose-600 tabular-nums ml-1.5">{fmt(Number(comm.current_balance))}</span>
                    <div className="w-10 h-1 rounded-full bg-slate-200 overflow-hidden ml-2">
                      <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 ml-1 shrink-0">{progress}%</span>
                    <div className="flex items-center gap-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
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
                        <button className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); openPayDialog(comm) }}>
                          <ArrowDownCircle className="size-3" />
                          {dict.pagar}
                        </button>
                        <button className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition-colors border border-slate-200" onClick={(e) => { e.stopPropagation(); openScheduleDialog(comm) }}>
                          <FileSpreadsheet className="size-3" />
                          Cronograma
                        </button>
                        {(schedulesMap[comm.id]?.length ?? 0) > 0 && (
                          <button className={`inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-colors border ${schedulePreviewId === comm.id ? "text-indigo-700 bg-indigo-50 border-indigo-200" : "text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200"}`} onClick={(e) => { e.stopPropagation(); setSchedulePreviewId(schedulePreviewId === comm.id ? null : comm.id) }}>
                            <BarChart3 className="size-3" />
                            Ver cronograma
                          </button>
                        )}
                      </div>
                      {schedulePreviewId === comm.id && (() => {
                        const sched = schedulesMap[comm.id] ?? []
                        const today = new Date().toISOString().split("T")[0]
                        return (
                          <div className="px-5 pb-2 border-b border-slate-100">
                            <div className="max-h-[300px] overflow-auto rounded-lg border border-slate-200">
                              <table className="w-full text-[10px]">
                                <thead className="bg-slate-100 sticky top-0 z-10">
                                  <tr>
                                    <th className="px-2 py-1.5 text-left font-medium text-slate-500">Fecha</th>
                                    <th className="px-2 py-1.5 text-right font-medium text-slate-500">Cuota</th>
                                    <th className="px-2 py-1.5 text-right font-medium text-slate-500">Capital</th>
                                    <th className="px-2 py-1.5 text-right font-medium text-slate-500">Interés</th>
                                    <th className="px-2 py-1.5 text-right font-medium text-slate-500">Gastos</th>
                                    <th className="px-2 py-1.5 text-right font-medium text-slate-500">Saldo</th>
                                    <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-10"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sched.map((row, idx) => {
                                    const isDisbursement = Number(row.cuota) === 0 && Number(row.capital) === 0
                                    const isPaid = row.is_paid
                                    const isNext = !isPaid && !isDisbursement && row.payment_date >= today && sched.filter((s) => !s.is_paid && Number(s.cuota) > 0).sort((a, b) => a.payment_date.localeCompare(b.payment_date))[0]?.payment_date === row.payment_date
                                    return (
                                      <tr key={idx} className={`border-t border-slate-100 ${isDisbursement ? "bg-slate-50 text-slate-400" : isPaid ? "bg-emerald-50/60" : isNext ? "bg-indigo-50/80 font-medium" : ""}`}>
                                        <td className="px-2 py-1">{new Date(row.payment_date + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                                        <td className="px-2 py-1 text-right tabular-nums">{isDisbursement ? "—" : fmt(Number(row.cuota) + Number(row.fees))}</td>
                                        <td className="px-2 py-1 text-right tabular-nums text-emerald-600">{isDisbursement ? "—" : fmt(Number(row.capital))}</td>
                                        <td className="px-2 py-1 text-right tabular-nums text-amber-600">{isDisbursement ? "—" : fmt(Number(row.interest))}</td>
                                        <td className="px-2 py-1 text-right tabular-nums text-slate-400">{isDisbursement ? "—" : fmt(Number(row.fees))}</td>
                                        <td className="px-2 py-1 text-right tabular-nums font-medium">{fmt(Number(row.remaining_balance))}</td>
                                        <td className="px-2 py-1 text-center">
                                          {isDisbursement ? (
                                            <span className="text-slate-300 text-[9px]">desembolso</span>
                                          ) : isPaid ? (
                                            <span className="text-emerald-500 font-medium">✓</span>
                                          ) : (
                                            <button
                                              className="text-[9px] font-medium text-white bg-indigo-500 hover:bg-indigo-600 px-2 py-0.5 rounded-full transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleMarkSchedulePaid(row.id)
                                              }}
                                            >
                                              Marcar pagado
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })()}
                      {(() => {
                        const sched = schedulesMap[comm.id] ?? []
                        if (sched.length === 0) return null
                        const unpaid = sched.filter((s) => !s.is_paid && s.cuota > 0)
                        const paid = sched.filter((s) => s.is_paid)
                        const next = unpaid.sort((a, b) => a.payment_date.localeCompare(b.payment_date))[0]
                        const totalPaid = paid.reduce((s, p) => s + Number(p.cuota), 0)
                        const totalCapital = paid.reduce((s, p) => s + Number(p.capital), 0)
                        const totalInterest = paid.reduce((s, p) => s + Number(p.interest), 0)
                        const scheduleProgress = sched.length > 1 ? Math.round((paid.length / (sched.length - 1)) * 100) : 0
                        return (
                          <div className="px-5 py-2.5 border-b border-slate-100 space-y-2">
                            {next && (
                              <div className="bg-indigo-50 rounded-lg px-3 py-2 flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] font-medium text-indigo-700">Proximo pago: {new Date(next.payment_date + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</p>
                                  <p className="text-[10px] text-indigo-600">
                                    Capital: {fmt(Number(next.capital))} · Interes: {fmt(Number(next.interest))} · Gastos: {fmt(Number(next.fees))} · Total: {fmt(Number(next.cuota) + Number(next.fees))}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-3 text-[10px]">
                              <span className="text-slate-500">Cuotas: <span className="font-semibold text-slate-700">{paid.length}/{sched.length - 1}</span></span>
                              <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${scheduleProgress}%` }} />
                              </div>
                              <span className="text-slate-500 font-medium">{scheduleProgress}%</span>
                            </div>
                            <div className="flex gap-3 text-[10px]">
                              <span className="text-slate-400">Pagado: <span className="text-slate-600 font-medium">{fmt(totalPaid)}</span></span>
                              <span className="text-slate-400">Capital: <span className="text-emerald-600 font-medium">{fmt(totalCapital)}</span></span>
                              <span className="text-slate-400">Intereses: <span className="text-amber-600 font-medium">{fmt(totalInterest)}</span></span>
                            </div>
                          </div>
                        )
                      })()}
                      {pays.length > 0 && (() => {
                        const chronological = [...pays].reverse()
                        const balances = new Map<string, number>()
                        let running = Number(comm.total_amount)
                        for (const cp of chronological) {
                          running -= Number(cp.capital_amount)
                          balances.set(cp.id, Math.max(0, running))
                        }
                        return (
                          <div className="px-5 pb-2 space-y-0.5">
                            {pays.map((p) => (
                              <div key={p.id} className="flex items-center justify-between px-2.5 py-1 text-[10px] bg-slate-50 rounded-lg">
                                <span className="text-slate-500">{new Date(p.date).toLocaleDateString("es-CO")}{p.notes ? ` · ${p.notes}` : ""}</span>
                                <div className="flex items-center gap-2">
                                  <span className="tabular-nums font-medium text-rose-600">{fmt(p.amount)} <span className="text-rose-600 font-medium">-{fmt(p.capital_amount)}</span></span>
                                  <span className="tabular-nums text-slate-400">→ {fmt(balances.get(p.id) ?? 0)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
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

      {selectedCommId && (() => {
        const comm = commitments.find((c) => c.id === selectedCommId)
        const pays = paymentsMap[selectedCommId] ?? []
        const chronological = [...pays].sort((a, b) => a.date.localeCompare(b.date))
        const totalPaid = pays.reduce((s, p) => s + Number(p.amount), 0)
        const totalCapital = pays.reduce((s, p) => s + Number(p.capital_amount), 0)
        const totalInterests = totalPaid - totalCapital
        const balances = new Map<string, number>()
        let running = comm ? Number(comm.total_amount) : 0
        for (const cp of chronological) {
          running -= Number(cp.capital_amount)
          balances.set(cp.id, Math.max(0, running))
        }
        return (
          <div className="mt-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pagos de: {comm?.name ?? ""}
              </span>
              <button onClick={() => setSelectedCommId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="size-4" />
              </button>
            </div>
            {pays.length > 0 ? (
              <>
                <div className="flex gap-4 px-4 py-2 bg-slate-50/50 border-b border-slate-100">
                  <div>
                    <p className="text-[9px] text-slate-400">Total pagado</p>
                    <p className="text-[10px] font-semibold text-slate-700">{fmt(totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Capital</p>
                    <p className="text-[10px] font-semibold text-emerald-600">{fmt(totalCapital)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Intereses</p>
                    <p className="text-[10px] font-semibold text-amber-600">{fmt(totalInterests)}</p>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {chronological.map((p) => {
                    const interests = Number(p.amount) - Number(p.capital_amount)
                    return (
                      <div key={p.id} className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
                            <ArrowDownCircle className="size-3" />
                          </div>
                          <div className="ml-2.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-slate-900">{new Date(p.date + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</p>
                              {p.notes && <span className="text-[10px] text-slate-400">· {p.notes}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-emerald-600">Capital: {fmt(Number(p.capital_amount))}</span>
                              {interests > 0 && <span className="text-[10px] text-amber-600">Interés: {fmt(interests)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs font-semibold text-rose-600 tabular-nums">{fmt(Number(p.amount))}</span>
                          <span className="text-[10px] text-slate-400 tabular-nums">→ {fmt(balances.get(p.id) ?? 0)}</span>
                          <div className="flex items-center gap-0.5">
                            <button className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5" onClick={() => openPayDialog(comm!)}>
                              <Pencil className="size-3" />
                            </button>
                            <button className="text-slate-400 hover:text-rose-600 transition-colors p-0.5" onClick={() => handleDeletePayment(p)}>
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400">
                  {pays.length} pago(s) registrado(s)
                </div>
              </>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-slate-400">Sin pagos registrados.</p>
              </div>
            )}
          </div>
        )
      })()}

      <Dialog open={openPay} onOpenChange={setOpenPay}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dict.pagar}: {payCommName}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Registrá un pago a este compromiso.</p>
          </DialogHeader>
          <form onSubmit={handlePaySubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Saldo actual: <strong className="text-slate-700">{fmt(payCommBalance)}</strong></span>
                <span>Monto total: <strong className="text-slate-700">{fmt(payCommTotal)}</strong></span>
              </div>
              {payCapital && Number(payCapital) > 0 && (
                <div className="text-xs text-emerald-600 font-medium">
                  Saldo después del pago: {fmt(Math.max(0, payCommBalance - Number(payCapital)))}
                </div>
              )}
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
              {people.length > 1 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Persona</Label>
                  <select value={payPersonId} onChange={(e) => setPayPersonId(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm">
                    {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" disabled={submitting}>{submitting ? "Procesando..." : dict.pagar}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openSchedule} onOpenChange={(v) => { if (!v) setScheduleComm(null); setOpenSchedule(v) }}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Cronograma: {scheduleComm?.name}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Cargá el cronograma de amortización para auto-calcular capital e intereses.</p>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-3">
            <label className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
              <Upload className="size-3" />
              Subir Excel
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleScheduleExcel} />
            </label>
            <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors" onClick={() => setOpenCalc(true)}>
              <Calculator className="size-3" />
              Calcular automático
            </button>
          </div>
          <div className="space-y-2 mb-3">
            <Label className="text-xs font-medium text-slate-600">O pegar datos (fecha, cuota, capital, interés, gastos, saldo)</Label>
            <textarea value={scheduleInput} onChange={(e) => setScheduleInput(e.target.value)} placeholder="02/12/2023&#9;383,83&#9;147,06&#9;187,70&#9;49,07&#9;25292,94&#10;02/01/2024&#9;344,32&#9;147,92&#9;147,33&#9;49,07&#9;25145,02" className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono resize-none" />
            <button type="button" onClick={handleSchedulePaste} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Parsear datos pegados</button>
          </div>
          <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-500">Fecha</th>
                  <th className="px-2 py-1.5 text-right font-medium text-slate-500">Cuota</th>
                  <th className="px-2 py-1.5 text-right font-medium text-slate-500">Capital</th>
                  <th className="px-2 py-1.5 text-right font-medium text-slate-500">Interés</th>
                  <th className="px-2 py-1.5 text-right font-medium text-slate-500">Gastos</th>
                  <th className="px-2 py-1.5 text-right font-medium text-slate-500">Saldo</th>
                  <th className="px-2 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {scheduleRows.map((row, idx) => {
                  const existingSched = schedulesMap[scheduleComm?.id ?? ""] ?? []
                  const isPaid = existingSched.some((s) => s.payment_date === row.payment_date && s.is_paid)
                  return (
                    <tr key={idx} className={`border-t border-slate-100 ${isPaid ? "bg-emerald-50" : idx === 0 ? "" : ""}`}>
                      <td className="px-1 py-0.5">
                        <div className="flex items-center gap-1">
                          {isPaid && <span className="text-emerald-500 text-[9px]">✓</span>}
                          <input type="date" value={row.payment_date} onChange={(e) => updateScheduleRow(idx, "payment_date", e.target.value)} className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs" disabled={isPaid} />
                        </div>
                      </td>
                      <td className="px-1 py-0.5"><input type="number" step="0.01" value={row.cuota} onChange={(e) => updateScheduleRow(idx, "cuota", e.target.value)} className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs text-right" disabled={isPaid} /></td>
                      <td className="px-1 py-0.5"><input type="number" step="0.01" value={row.capital} onChange={(e) => updateScheduleRow(idx, "capital", e.target.value)} className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs text-right" disabled={isPaid} /></td>
                      <td className="px-1 py-0.5"><input type="number" step="0.01" value={row.interest} onChange={(e) => updateScheduleRow(idx, "interest", e.target.value)} className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs text-right" disabled={isPaid} /></td>
                      <td className="px-1 py-0.5"><input type="number" step="0.01" value={row.fees} onChange={(e) => updateScheduleRow(idx, "fees", e.target.value)} className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs text-right" disabled={isPaid} /></td>
                      <td className="px-1 py-0.5"><input type="number" step="0.01" value={row.remaining_balance} onChange={(e) => updateScheduleRow(idx, "remaining_balance", e.target.value)} className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs text-right" disabled={isPaid} /></td>
                      <td className="px-1 py-0.5">{!isPaid && <button type="button" onClick={() => removeScheduleRow(idx)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 className="size-3" /></button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {scheduleRows.length > 0 && (
            <p className="text-[10px] text-slate-400 mt-1">{scheduleRows.length} cuotas cargadas</p>
          )}
          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={addScheduleRow} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Agregar fila</button>
            <div className="flex gap-2">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button onClick={handleSaveSchedule} disabled={submitting || scheduleRows.length === 0}>{submitting ? "Guardando..." : "Guardar cronograma"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openCalc} onOpenChange={setOpenCalc}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Calcular cronograma</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Ingresá los datos del préstamo para generar el cronograma automáticamente.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Capital prestado</Label>
              <Input type="number" step="0.01" min="0" value={calcPrincipal} onChange={(e) => setCalcPrincipal(e.target.value)} placeholder="25440" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Cuota mensual total</Label>
                <Input type="number" step="0.01" min="0" value={calcCuota} onChange={(e) => setCalcCuota(e.target.value)} placeholder="344.32" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Plazo (meses)</Label>
                <Input type="number" step="1" min="1" value={calcTerm} onChange={(e) => setCalcTerm(e.target.value)} placeholder="120" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Gastos fijos/mes</Label>
                <Input type="number" step="0.01" min="0" value={calcFees} onChange={(e) => setCalcFees(e.target.value)} placeholder="49.07" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Fecha primer pago</Label>
                <Input type="date" value={calcStart} onChange={(e) => setCalcStart(e.target.value)} />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">La cuota mensual es el total que pagás cada mes (capital + intereses + gastos). Los gastos se restan para calcular capital e intereses.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
            <Button onClick={handleCalcGenerate} disabled={!calcPrincipal || !calcCuota || !calcTerm}>Generar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
