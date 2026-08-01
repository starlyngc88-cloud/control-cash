"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getMonthlyBudgetDashboard, getPeople, createExpense, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory } from "@/lib/db"
import type { DashboardCategory } from "@/lib/db"
import type { Person } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Circle, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { friendlyError } from "@/lib/errors"
import { Tooltip } from "@/components/ui/tooltip"

export default function MonthlyBudgetPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<Awaited<ReturnType<typeof getMonthlyBudgetDashboard>> | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { t, fmt } = useLanguage()
  const d = t.presupuestoDetail

  const [openExpense, setOpenExpense] = useState(false)
  const [expCatId, setExpCatId] = useState("")
  const [expCatName, setExpCatName] = useState("")
  const [expAmount, setExpAmount] = useState("")
  const [expDesc, setExpDesc] = useState("")
  const [expPerson, setExpPerson] = useState("")
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0])

  const [openCatEdit, setOpenCatEdit] = useState(false)
  const [editCat, setEditCat] = useState<DashboardCategory | null>(null)
  const [editCatName, setEditCatName] = useState("")
  const [editCatBudgeted, setEditCatBudgeted] = useState("")
  const [editCatHasChildren, setEditCatHasChildren] = useState(false)
  const [editCatHasSub, setEditCatHasSub] = useState(false)

  const [openAddRoot, setOpenAddRoot] = useState(false)
  const [addRootName, setAddRootName] = useState("")
  const [addRootBudgeted, setAddRootBudgeted] = useState("")

  const [openAddSub, setOpenAddSub] = useState(false)
  const [addSubParent, setAddSubParent] = useState<DashboardCategory | null>(null)
  const [addSubName, setAddSubName] = useState("")
  const [addSubBudgeted, setAddSubBudgeted] = useState("")

  const [catToDelete, setCatToDelete] = useState<DashboardCategory | null>(null)

  const reload = async () => {
    const res = await getMonthlyBudgetDashboard(id)
    setData(res)
  }

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const [res, p] = await Promise.all([getMonthlyBudgetDashboard(id), getPeople()])
        setData(res)
        setPeople(p)
      } catch (err) {
        setError(friendlyError(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>
  if (!data) return <p className="text-muted-foreground">{d.notFound}</p>

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  }

  const parents = data.categories.filter(c => !c.parent_id)
  const totalExcess = parents.reduce((s, p) => s + p.excess, 0)
  const totalAvailable = data.totalBudgeted - data.totalGastos
  const childrenMap = new Map<string, DashboardCategory[]>()
  for (const cat of data.categories) {
    if (cat.parent_id) {
      const arr = childrenMap.get(cat.parent_id) ?? []
      arr.push(cat)
      childrenMap.set(cat.parent_id, arr)
    }
  }

  const openAddExpense = (catId: string, catName: string) => {
    setExpCatId(catId)
    setExpCatName(catName)
    setExpAmount("")
    setExpDesc("")
    setExpPerson(people[0]?.id ?? "")
    setExpDate(new Date().toISOString().split("T")[0])
    setOpenExpense(true)
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expAmount || !expPerson) return
    setSubmitting(true)
    try {
      await createExpense({
        person_id: expPerson,
        amount: parseFloat(expAmount),
        description: expDesc || expCatName,
        date: expDate,
        budget_category_id: expCatId,
      })
      setOpenExpense(false)
      await reload()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (cat: DashboardCategory) => {
    const hasChildren = (childrenMap.get(cat.id) ?? []).length > 0
    setEditCat(cat)
    setEditCatName(cat.name)
    setEditCatBudgeted(String(cat.budgeted))
    setEditCatHasChildren(hasChildren)
    setEditCatHasSub(hasChildren || cat.budgeted === 0)
    setOpenCatEdit(true)
  }

  const handleEditCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCat || !editCatName.trim()) return
    setSubmitting(true)
    try {
      if (editCatHasChildren || editCatHasSub) {
        await updateBudgetCategory(editCat.id, { name: editCatName.trim(), budgeted: 0 })
      } else {
        await updateBudgetCategory(editCat.id, { name: editCatName.trim(), budgeted: parseFloat(editCatBudgeted || "0") })
      }
      setOpenCatEdit(false)
      setEditCat(null)
      await reload()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const openAddRootDialog = () => {
    setAddRootName("")
    setAddRootBudgeted("")
    setOpenAddRoot(true)
  }

  const handleAddRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addRootName.trim()) return
    setSubmitting(true)
    try {
      await createBudgetCategory({ monthly_budget_id: id, name: addRootName.trim(), budgeted: parseFloat(addRootBudgeted || "0"), parent_id: null })
      setOpenAddRoot(false)
      await reload()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const openAddSubDialog = (parent: DashboardCategory) => {
    setAddSubParent(parent)
    setAddSubName("")
    setAddSubBudgeted("")
    setOpenAddSub(true)
  }

  const handleAddSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addSubParent || !addSubName.trim()) return
    setSubmitting(true)
    try {
      await createBudgetCategory({ monthly_budget_id: id, name: addSubName.trim(), budgeted: parseFloat(addSubBudgeted || "0"), parent_id: addSubParent.id })
      setOpenAddSub(false)
      setAddSubParent(null)
      await reload()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDeleteCat = async () => {
    if (!catToDelete) return
    setSubmitting(true)
    try {
      await deleteBudgetCategory(catToDelete.id)
      setCatToDelete(null)
      await reload()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const actionsCell = (cat: DashboardCategory, isChild = false) => (
    <td className={`py-1 px-2 ${isChild ? "py-0.5" : ""}`}>
      <div className="flex items-center justify-end gap-0.5">
        <button onClick={() => openAddSubDialog(cat)} className="p-0.5 rounded hover:bg-accent text-slate-400 hover:text-indigo-600" title="Agregar subcategoría">
          <Plus className="size-3" />
        </button>
        <button onClick={() => openEdit(cat)} className="p-0.5 rounded hover:bg-accent text-slate-400 hover:text-indigo-600" title="Editar rubro">
          <Pencil className="size-3" />
        </button>
        <button onClick={() => setCatToDelete(cat)} className="p-0.5 rounded hover:bg-accent text-slate-400 hover:text-rose-600" title="Eliminar rubro">
          <Trash2 className="size-3" />
        </button>
      </div>
    </td>
  )

  return (
    <div className="space-y-3">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
      <div className="flex items-center gap-2">
        <Link href="/presupuestos" className="flex items-center justify-center size-7 rounded hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h2 className="text-lg font-bold capitalize">{formatMonth(data.month)}</h2>
        <span className="text-xs text-muted-foreground">· {data.templateName}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs border rounded-lg px-3 py-2 bg-muted/30">
        {(() => {
          const parentIds = data.categories.filter(c => !c.parent_id).map(c => c.id)
          if (parentIds.length === 0) return null
          const allExpanded = parentIds.every(id => expanded.has(id))
          return (
            <button
              onClick={() => {
                if (allExpanded) {
                  setExpanded(new Set())
                } else {
                  setExpanded(new Set(parentIds))
                }
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border hover:bg-muted shrink-0"
            >
              {allExpanded ? "▲" : "▼"}
            </button>
          )
        })()}
        <Tooltip content="Total de ingresos del mes">
          <span><span className="text-muted-foreground">{d.ingresos}</span> <b className="text-green-600">{fmt(data.totalIngresos)}</b></span>
        </Tooltip>
        <Tooltip content="Total presupuestado del mes">
          <span><span className="text-muted-foreground">{d.presupuestado}</span> <b className="text-blue-600">{fmt(data.totalBudgeted)}</b></span>
        </Tooltip>
        <Tooltip content="Total gastado del mes">
          <span><span className="text-muted-foreground">{d.gastado}</span> <b className="text-red-600">{fmt(data.totalGastos)}</b></span>
        </Tooltip>
        <Tooltip content="Disponible del presupuesto: presupuestado − gastado">
          <span><span className="text-muted-foreground">{d.disponible}</span> <b className={data.totalBudgeted - data.totalGastos >= 0 ? "text-green-600" : "text-red-600"}>{fmt(data.totalBudgeted - data.totalGastos)}</b></span>
        </Tooltip>
        <Tooltip content="Balance del mes: ingresos − gastos">
          <span><span className="text-muted-foreground">{d.balance}</span> <b className={data.balance >= 0 ? "text-green-600" : "text-red-600"}>{fmt(data.balance)}</b></span>
        </Tooltip>
        <Tooltip content="Exceso total del mes: gastos que superaron el presupuesto">
          <span><span className="text-muted-foreground">{d.exceso}</span> <b className="text-red-600">{fmt(totalExcess)}</b></span>
        </Tooltip>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">Ediciones aquí solo afectan a este mes.</p>
        <button onClick={openAddRootDialog} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
          <Plus className="size-3.5" /> Agregar rubro
        </button>
      </div>

      {data.categories.length === 0 ? (
        <div className="border rounded-lg p-6 text-center space-y-3">
          <p className="text-xs text-muted-foreground">{d.empty}</p>
          <button onClick={openAddRootDialog} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
            <Plus className="size-3.5" /> Agregar primer rubro
          </button>
        </div>
      ) : (
        <div className="border rounded-lg max-h-[70vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-muted/50">
                <th className="text-left py-1.5 px-2 font-medium text-muted-foreground w-1/3 bg-muted/50">{d.rubro}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground bg-muted/50">{d.ppto}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground bg-muted/50">{d.gastado}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground bg-muted/50">{d.disponible}</th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground bg-muted/50">{d.exceso}</th>
                <th className="text-center py-1.5 px-2 font-medium text-muted-foreground w-16 bg-muted/50">{d.estado}</th>
                <th className="py-1.5 px-2 bg-muted/50 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {parents.flatMap((parent) => {
                const children = childrenMap.get(parent.id) ?? []
                const isExpanded = expanded.has(parent.id)

                const ppct = parent.percentage === Infinity ? 0 : Math.round(parent.percentage)
                const ppctClass =
                  ppct === 0 ? "text-green-700 bg-green-100 dark:bg-green-900/40" :
                  ppct >= 100 ? "text-red-700 bg-red-100 dark:bg-red-900/40" :
                  "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40"

                const parentRow = (
                  <tr key={parent.id} className="border-b bg-slate-50/70 hover:bg-indigo-50/70 transition-colors">
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1">
                        {children.length > 0 ? (
                          <button onClick={() => toggle(parent.id)} className="p-0.5 rounded hover:bg-accent text-gray-400 hover:text-gray-600">
                            {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                          </button>
                        ) : (
                          <button onClick={() => openAddExpense(parent.id, parent.name)} className="p-0.5 rounded hover:bg-accent" title={`Agregar gasto a ${parent.name}`}>
                            <span className="text-sm leading-none">➕</span>
                          </button>
                        )}
                        <Circle className={`size-2.5 fill-current shrink-0 ${
                          parent.status === "green" ? "text-green-500" :
                          parent.status === "yellow" ? "text-yellow-500" : "text-red-500"
                        }`} />
                        <span className="font-bold truncate">{parent.name}</span>
                      </div>
                    </td>
                    <td className="py-1 px-2 text-right tabular-nums font-semibold">{fmt(parent.budgeted)}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-semibold">{fmt(parent.spent)}</td>
                    <td className={`py-1 px-2 text-right tabular-nums font-semibold ${parent.available <= 0 ? "text-red-600" : ""}`}>{fmt(parent.available)}</td>
                    <td className="py-1 px-2 text-right tabular-nums font-semibold">
                      {parent.excess > 0 ? <span className="text-red-600">{fmt(parent.excess)}</span> : <span className="text-muted-foreground">{d.emDash}</span>}
                    </td>
                    <td className="py-1 px-2 text-center">
                      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${ppctClass}`}>
                        {ppct > 0 ? `${ppct}%` : d.emDash}
                      </span>
                    </td>
                    {actionsCell(parent)}
                  </tr>
                )

                const childRows = isExpanded ? children.map((child) => {
                  const cpct = child.percentage === Infinity ? 0 : Math.round(child.percentage)
                  const cpctClass =
                    cpct === 0 ? "text-green-700 bg-green-100 dark:bg-green-900/40" :
                    cpct >= 100 ? "text-red-700 bg-red-100 dark:bg-red-900/40" :
                    "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40"
                  return (
                    <tr key={child.id} className="border-b hover:bg-indigo-50/40 transition-colors bg-muted/5">
                      <td className="py-0.5 px-2 pl-8">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openAddExpense(child.id, child.name)} className="p-0.5 rounded hover:bg-accent" title={`Agregar gasto a ${child.name}`}>
                            <span className="text-xs leading-none">➕</span>
                          </button>
                          <Circle className={`size-2 fill-current shrink-0 ${
                            child.status === "green" ? "text-green-500" :
                            child.status === "yellow" ? "text-yellow-500" : "text-red-500"
                          }`} />
                          <span className="text-muted-foreground">└ {child.name}</span>
                        </div>
                      </td>
                      <td className="py-0.5 px-2 text-right tabular-nums">{fmt(child.budgeted)}</td>
                      <td className="py-0.5 px-2 text-right tabular-nums font-medium">{fmt(child.spent)}</td>
                      <td className={`py-0.5 px-2 text-right tabular-nums ${child.available <= 0 ? "text-red-600 font-medium" : ""}`}>{fmt(child.available)}</td>
                      <td className="py-0.5 px-2 text-right tabular-nums">
                        {child.excess > 0 ? <span className="text-red-600 font-medium">{fmt(child.excess)}</span> : <span className="text-muted-foreground">{d.emDash}</span>}
                      </td>
                      <td className="py-0.5 px-2 text-center">
                        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${cpctClass}`}>
                          {cpct > 0 ? `${cpct}%` : d.emDash}
                        </span>
                      </td>
                      {actionsCell(child, true)}
                    </tr>
                  )
                }) : []

                return [parentRow, ...childRows]
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100/80">
                <td className="py-1.5 px-2 font-bold text-slate-700">Totales</td>
                <td className="py-1.5 px-2 text-right tabular-nums font-bold text-slate-800">{fmt(data.totalBudgeted)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums font-bold text-slate-800">{fmt(data.totalGastos)}</td>
                <td className={`py-1.5 px-2 text-right tabular-nums font-bold ${totalAvailable < 0 ? "text-red-600" : "text-slate-800"}`}>{fmt(totalAvailable)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums font-bold">
                  {totalExcess > 0 ? <span className="text-red-600">{fmt(totalExcess)}</span> : <span className="text-muted-foreground">{d.emDash}</span>}
                </td>
                <td className="py-1.5 px-2"></td>
                <td className="py-1.5 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Dialog open={openExpense} onOpenChange={setOpenExpense}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar gasto: {expCatName}</DialogTitle></DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expPerson">Persona</Label>
              <select
                id="expPerson"
                value={expPerson}
                onChange={(e) => setExpPerson(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                required
              >
                <option value="">Seleccionar persona</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expAmount">Monto</Label>
              <Input id="expAmount" type="number" step="0.01" min="0.01" placeholder="0.00" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expDesc">Descripción (opcional)</Label>
              <Input id="expDesc" placeholder={expCatName} value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expDate">Fecha</Label>
              <Input id="expDate" type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Guardando..." : "Guardar gasto"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openCatEdit} onOpenChange={(v) => { if (!v) setEditCat(null); setOpenCatEdit(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar rubro</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Modificá el nombre y monto de este rubro. Solo afecta a este mes.</p>
          </DialogHeader>
          <form onSubmit={handleEditCatSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-sm font-medium text-slate-700">Nombre</Label>
                <Input id="catName" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} required />
              </div>
              {editCatHasChildren ? (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Monto</Label>
                  <p className="text-xs text-slate-500">Calculado automáticamente de las subcategorías</p>
                </div>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={editCatHasSub}
                      onChange={(e) => { setEditCatHasSub(e.target.checked); if (e.target.checked) setEditCatBudgeted("0") }}
                      className="accent-indigo-600 rounded"
                    />
                    Tiene subcategorías
                  </label>
                  {editCatHasSub ? (
                    <p className="text-xs text-slate-500">El valor se calculará automáticamente como la suma de sus subcategorías.</p>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="catBudgeted" className="text-sm font-medium text-slate-700">Monto</Label>
                      <Input id="catBudgeted" type="number" step="0.01" min="0" value={editCatBudgeted} onChange={(e) => setEditCatBudgeted(e.target.value)} required />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setOpenCatEdit(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : "Guardar cambios"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openAddRoot} onOpenChange={(v) => { setOpenAddRoot(v); if (!v) { setAddRootName(""); setAddRootBudgeted("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo rubro</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Se agrega solo a este mes.</p>
          </DialogHeader>
          <form onSubmit={handleAddRootSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="addRootName" className="text-sm font-medium text-slate-700">Nombre</Label>
                <Input id="addRootName" value={addRootName} onChange={(e) => setAddRootName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addRootBudgeted" className="text-sm font-medium text-slate-700">Monto</Label>
                <Input id="addRootBudgeted" type="number" step="0.01" min="0" value={addRootBudgeted} onChange={(e) => setAddRootBudgeted(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setOpenAddRoot(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Agregando..." : "Agregar rubro"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openAddSub} onOpenChange={(v) => { setOpenAddSub(v); if (!v) { setAddSubParent(null); setAddSubName(""); setAddSubBudgeted("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva subcategoría</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Dentro de {addSubParent?.name ?? ""} (solo este mes).</p>
          </DialogHeader>
          <form onSubmit={handleAddSubSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="addSubName" className="text-sm font-medium text-slate-700">Nombre</Label>
                <Input id="addSubName" value={addSubName} onChange={(e) => setAddSubName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addSubBudgeted" className="text-sm font-medium text-slate-700">Monto</Label>
                <Input id="addSubBudgeted" type="number" step="0.01" min="0" value={addSubBudgeted} onChange={(e) => setAddSubBudgeted(e.target.value)} required />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setOpenAddSub(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Agregando..." : "Agregar subcategoría"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!catToDelete} onOpenChange={(v) => { if (!v) setCatToDelete(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar "{catToDelete?.name}"?</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Los gastos asociados a este rubro quedarán sin rubro. Solo afecta a este mes.</p>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setCatToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteCat} disabled={submitting}>{submitting ? "Eliminando..." : "Eliminar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
