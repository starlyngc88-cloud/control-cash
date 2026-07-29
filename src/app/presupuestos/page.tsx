"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
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
import { MonthPicker } from "@/components/ui/month-picker"
import {
  getBudgetTemplates,
  createBudgetTemplate,
  getBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  getMonthlyBudgets,
  createMonthlyBudget,
  deleteMonthlyBudget,
  buildCategoryTree,
} from "@/lib/db"
import { supabase } from "@/lib/supabase"
import type { BudgetTemplate, BudgetCategory, MonthlyBudget, Expense } from "@/types"
import { Plus, Trash2, Pencil, Calendar, ChevronRight, ChevronDown, PiggyBank, FolderDown } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"
import { friendlyError } from "@/lib/errors"
import { useHeaderActions } from "@/components/HeaderActionsContext"

export default function PresupuestosPage() {
  const [template, setTemplate] = useState<BudgetTemplate | null>(null)
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [monthlyBudgets, setMonthlyBudgets] = useState<(MonthlyBudget & { budget_templates: Pick<BudgetTemplate, "name"> })[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { t, fmt } = useLanguage()
  const p = t.presupuestos

  const [openDeleteCat, setOpenDeleteCat] = useState(false)
  const [deleteCatId, setDeleteCatId] = useState("")
  const [deleteCatName, setDeleteCatName] = useState("")
  const [deleteCatExpenses, setDeleteCatExpenses] = useState<Expense[]>([])

  const [openMonth, setOpenMonth] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState("")

  const [openCatEdit, setOpenCatEdit] = useState(false)
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null)
  const [editCatName, setEditCatName] = useState("")
  const [editCatBudgeted, setEditCatBudgeted] = useState("")
  const [editCatHasChildren, setEditCatHasChildren] = useState(false)
  const [editCatHasSub, setEditCatHasSub] = useState(false)

  const [addingSub, setAddingSub] = useState<string | null>(null)
  const [subCatName, setSubCatName] = useState("")
  const [subCatBudgeted, setSubCatBudgeted] = useState("")

  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  const [openNewCat, setOpenNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatBudgeted, setNewCatBudgeted] = useState("")
  const [newCatHasSub, setNewCatHasSub] = useState(false)

  const [openSubCat, setOpenSubCat] = useState(false)
  const [subParentId, setSubParentId] = useState("")
  const [subCreateName, setSubCreateName] = useState("")
  const [subCreateBudgeted, setSubCreateBudgeted] = useState("")

  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false)
  const headerDropdownRef = useRef<HTMLDivElement>(null)

  const { setActions } = useHeaderActions()

  const handleSubCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subParentId || !subCreateName.trim()) return
    setSubmitting(true)
    try {
      await createBudgetCategory({
        template_id: template!.id,
        name: subCreateName.trim(),
        budgeted: parseFloat(subCreateBudgeted || "0"),
        parent_id: subParentId,
      })
      setOpenSubCat(false)
      setSubParentId("")
      setSubCreateName("")
      setSubCreateBudgeted("")
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
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
                onClick={() => { setOpenNewCat(true); setHeaderDropdownOpen(false) }}
              >
                <FolderDown className="size-4 text-indigo-500" />
                Nuevo rubro
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                onClick={() => { setOpenMonth(true); setHeaderDropdownOpen(false) }}
              >
                <Calendar className="size-4 text-indigo-500" />
                Abrir mes
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                onClick={() => { setOpenSubCat(true); setHeaderDropdownOpen(false) }}
              >
                <FolderDown className="size-4 text-indigo-500" />
                Nueva subcategoría
              </button>
            </div>
          </>
        )}
      </div>
    )
    return () => setActions(null)
  }, [headerDropdownOpen, setOpenNewCat, setOpenMonth, setOpenSubCat, setActions])

  const toggleParent = (id: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const ensureBaseTemplate = useCallback(async () => {
    const [templates, months] = await Promise.all([getBudgetTemplates(), getMonthlyBudgets()])
    let tmpl = templates.find((t) => t.name.toLowerCase() === "modelo base")
    if (!tmpl) {
      tmpl = await createBudgetTemplate("Modelo Base")
    }
    setTemplate(tmpl)
    setMonthlyBudgets(months)
    const cats = await getBudgetCategories(tmpl.id)
    setCategories(cats)
    setLoading(false)
  }, [])

  useEffect(() => { ensureBaseTemplate() }, [ensureBaseTemplate])

  const load = useCallback(async () => {
    if (!template) return
    const months = await getMonthlyBudgets()
    setMonthlyBudgets(months)
    const cats = await getBudgetCategories(template.id)
    setCategories(cats)
  }, [template])

  useEffect(() => { if (template) load() }, [template, load])

  const handleAddCategory = async (name: string, budgeted: string, parentId: string | null) => {
    if (!template || !name.trim() || !budgeted) return
    setSubmitting(true)
    try {
      await createBudgetCategory({
        template_id: template.id,
        name: name.trim(),
        budgeted: parseFloat(budgeted),
        parent_id: parentId,
      })
      setAddingSub(null)
      setSubCatName("")
      setSubCatBudgeted("")
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitNewParentCat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!template || !newCatName.trim()) return
    if (!newCatHasSub && !newCatBudgeted) return
    setSubmitting(true)
    try {
      await createBudgetCategory({
        template_id: template.id,
        name: newCatName.trim(),
        budgeted: newCatHasSub ? 0 : parseFloat(newCatBudgeted),
        parent_id: null,
      })
      setOpenNewCat(false)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCat || !editCatName.trim()) return
    setSubmitting(true)
    try {
      if (editCatHasChildren || editCatHasSub) {
        await updateBudgetCategory(editingCat.id, { name: editCatName.trim(), budgeted: 0 })
      } else {
        await updateBudgetCategory(editingCat.id, { name: editCatName.trim(), budgeted: parseFloat(editCatBudgeted || "0") })
      }
      setOpenCatEdit(false)
      setEditingCat(null)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    const { data: expenses } = await supabase.from("expenses").select("*").eq("budget_category_id", id)
    if (expenses && expenses.length > 0) {
      setDeleteCatId(id)
      setDeleteCatName(name)
      setDeleteCatExpenses(expenses)
      setOpenDeleteCat(true)
    } else {
      setSubmitting(true)
      try {
        await deleteBudgetCategory(id)
        load()
      } catch (err) {
        setError(friendlyError(err))
      } finally {
        setSubmitting(false)
      }
    }
  }

  const confirmDeleteCategory = async () => {
    setSubmitting(true)
    try {
      for (const exp of deleteCatExpenses) {
        await supabase.from("expenses").delete().eq("id", exp.id)
      }
      await deleteBudgetCategory(deleteCatId)
      setOpenDeleteCat(false)
      setDeleteCatExpenses([])
      setDeleteCatId("")
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateMonth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!template || !selectedMonth) return
    setSubmitting(true)
    try {
      const firstDay = selectedMonth + "-01"
      await createMonthlyBudget({ template_id: template.id, month: firstDay })
      setOpenMonth(false)
      setSelectedMonth("")
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteMonth = async (id: string) => {
    if (!confirm(p.deleteMonthConfirm)) return
    setSubmitting(true)
    try {
      await deleteMonthlyBudget(id)
      load()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  }

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  if (!template) return <p className="text-muted-foreground">Error al cargar el modelo base</p>

  const allCats = categories
  const parents = buildCategoryTree(allCats)

  return (
    <div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Categories */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {allCats.length > 0 && (
              <>
              <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rubros</span>
                <button
                  onClick={() => {
                    if (expandedParents.size === parents.filter(p => p.children.length > 0).length) {
                      setExpandedParents(new Set())
                    } else {
                      setExpandedParents(new Set(parents.filter(p => p.children.length > 0).map(p => p.id)))
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                >
                  {expandedParents.size === parents.filter(p => p.children.length > 0).length ? "Contraer todo" : "Expandir todo"}
                </button>
              </div>
              <div>
                {parents.map((parent) => {
                  const isExpanded = expandedParents.has(parent.id)
                  return (
                  <div key={parent.id}>
                    <div className="flex items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
                      <button onClick={() => toggleParent(parent.id)} className="text-slate-400 hover:text-slate-600 mr-2">
                        {parent.children.length > 0 ? (
                          isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />
                        ) : (
                          <span className="size-4 block" />
                        )}
                      </button>
                      <button className="text-slate-400 hover:text-indigo-600 transition-colors p-1 mr-0.5" title="Subcategoría" onClick={() => { setAddingSub(addingSub === parent.id ? null : parent.id); setSubCatName(""); setSubCatBudgeted("") }}>
                        <FolderDown className="size-3.5" />
                      </button>
                      <button className="text-slate-400 hover:text-indigo-600 transition-colors p-1 mr-0.5" onClick={() => { setEditingCat(parent); setEditCatName(parent.name); setEditCatBudgeted(String(parent.budgeted)); setOpenCatEdit(true); setEditCatHasChildren(parent.children.length > 0); setEditCatHasSub(parent.children.length > 0 || parent.budgeted === 0) }}>
                        <Pencil className="size-3.5" />
                      </button>
                      <button className="text-slate-400 hover:text-rose-600 transition-colors p-1 mr-0.5" onClick={() => handleDeleteCategory(parent.id, parent.name)}>
                        <Trash2 className="size-3.5" />
                      </button>
                      <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{parent.name}</span>
                      <span className="ml-auto text-sm font-semibold text-slate-700 tabular-nums">
                        {parent.children.length > 0 ? fmt(parent.children.reduce((s, c) => s + c.budgeted, 0)) : fmt(parent.budgeted)}
                      </span>
                    </div>

                    {parent.children.length > 0 && isExpanded && parent.children.map((child) => (
                      <div key={child.id} className="flex items-center px-6 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center bg-slate-100 text-slate-600">
                            <FolderDown className="size-3.5" />
                          </div>
                          <div className="ml-3 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{child.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 ml-4">
                          <span className="text-sm font-semibold text-slate-900 tabular-nums">{fmt(child.budgeted)}</span>
                          <div className="flex items-center gap-1">
                            <button className="text-slate-400 hover:text-indigo-600 transition-colors p-1" onClick={() => { setEditingCat(child); setEditCatName(child.name); setEditCatBudgeted(String(child.budgeted)); setOpenCatEdit(true) }}>
                              <Pencil className="size-3.5" />
                            </button>
                            <button className="text-slate-400 hover:text-rose-600 transition-colors p-1" onClick={() => handleDeleteCategory(child.id, child.name)}>
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {addingSub === parent.id && (
                      <div className="flex items-center gap-2 px-6 py-3 bg-white border-b border-slate-100">
                        <input
                          placeholder="Sub"
                          className="h-8 px-2 text-sm rounded-lg border border-slate-200 bg-white flex-1 min-w-0 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          value={subCatName}
                          onChange={(e) => setSubCatName(e.target.value)}
                          autoFocus
                        />
                        <input
                          type="number" step="0.01" min="0"
                          placeholder="$"
                          className="h-8 px-2 text-sm rounded-lg border border-slate-200 bg-white w-24 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent tabular-nums"
                          value={subCatBudgeted}
                          onChange={(e) => setSubCatBudgeted(e.target.value)}
                        />
                        <button className="text-indigo-600 hover:text-indigo-800 shrink-0 p-1" onClick={() => handleAddCategory(subCatName, subCatBudgeted, parent.id)}>
                          <Plus className="size-4" />
                        </button>
                        <button className="text-slate-400 hover:text-slate-600 shrink-0 p-1" onClick={() => setAddingSub(null)}>
                          <span className="text-sm">✕</span>
                        </button>
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
              </>
            )}

            {allCats.length > 0 && (
              <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Total</span>
                <span className="text-sm font-semibold text-slate-700 tabular-nums">
                  {fmt(allCats.filter(c => !c.parent_id).reduce((s, p) => {
                    const children = allCats.filter(ch => ch.parent_id === p.id)
                    return s + (children.length > 0 ? children.reduce((cs, ch) => cs + ch.budgeted, 0) : p.budgeted)
                  }, 0))}
                </span>
              </div>
            )}

            <div className="border-t border-slate-200">
              <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 w-full px-6 py-4 hover:bg-slate-50 transition-colors" onClick={() => setOpenNewCat(true)}>
                <Plus className="size-3.5" /> {p.agregarRubro}
              </button>
            </div>
          </div>
        </div>

        {/* Monthly budgets */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{p.mesesFinancieros}</span>
            </div>
            {monthlyBudgets.length === 0 ? (
              <p className="text-sm text-slate-500 p-6">{p.emptyMonths}</p>
            ) : (
              <div>
                {monthlyBudgets.map((mb) => (
                  <div key={mb.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-900 capitalize block">{formatMonth(mb.month)}</span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {fmt(parents.reduce((s, p) => {
                          const children = categories.filter(ch => ch.parent_id === p.id)
                          return s + (children.length > 0 ? children.reduce((cs, ch) => cs + ch.budgeted, 0) : p.budgeted)
                        }, 0))} presupuestado
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/presupuestos/${mb.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                        {p.verDetalle} <ChevronRight className="size-3" />
                      </Link>
                      <button className="text-slate-400 hover:text-rose-600 transition-colors p-1" onClick={() => handleDeleteMonth(mb.id)}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-slate-200">
              <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 w-full px-6 py-4 hover:bg-slate-50 transition-colors" onClick={() => setOpenMonth(true)}>
                <Calendar className="size-3.5" /> {p.mes}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={openCatEdit} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCatEdit(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{p.editCategoryTitle}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Modificá el nombre y monto del rubro.</p>
          </DialogHeader>
          <form onSubmit={handleEditCategory} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-sm font-medium text-slate-700">{p.catNombre}</Label>
                <Input id="catName" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} required />
              </div>
              {editCatHasChildren ? (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">{p.catMonto}</Label>
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
                      <Label htmlFor="catBudgeted" className="text-sm font-medium text-slate-700">{p.catMonto}</Label>
                      <Input id="catBudgeted" type="number" step="0.01" min="0" value={editCatBudgeted} onChange={(e) => setEditCatBudgeted(e.target.value)} required />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : p.catGuardarCambios}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openMonth} onOpenChange={setOpenMonth}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{p.newMonthTitle}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Seleccioná el mes y año que querés abrir.</p>
          </DialogHeader>
          <form onSubmit={handleCreateMonth} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
              {allCats.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-px text-xs">
                  <p className="text-[10px] text-slate-500 sticky top-0 bg-slate-50 pb-0.5 font-semibold uppercase tracking-wider">{p.rubrosLabel}</p>
                  {allCats.filter(c => !c.parent_id).map((cat) => {
                    const children = allCats.filter(c => c.parent_id === cat.id)
                    const parentTotal = children.length > 0 ? children.reduce((s, c) => s + c.budgeted, 0) : cat.budgeted
                    return (
                      <div key={cat.id}>
                        <div className="flex justify-between text-[11px] px-2 py-1 rounded bg-white border border-slate-100 font-medium text-slate-700">
                          <span className="truncate mr-2">{cat.name}</span>
                          <span className="tabular-nums shrink-0">{fmt(parentTotal)}</span>
                        </div>
                        {children.map((child) => (
                          <div key={child.id} className="flex justify-between text-[11px] pl-4 pr-2 py-0.5 text-slate-500">
                            <span className="truncate mr-2">└ {child.name}</span>
                            <span className="tabular-nums shrink-0">{fmt(child.budgeted)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Creando..." : p.crearMes}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openNewCat} onOpenChange={setOpenNewCat}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo rubro</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Agregá una categoría de presupuesto.</p>
          </DialogHeader>
          <form onSubmit={handleSubmitNewParentCat} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="addCatName" className="text-sm font-medium text-slate-700">{p.catNombre}</Label>
                <Input id="addCatName" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={newCatHasSub}
                  onChange={(e) => setNewCatHasSub(e.target.checked)}
                  className="accent-indigo-600 rounded"
                />
                Tiene subcategorías
              </label>
              {newCatHasSub ? (
                <p className="text-xs text-slate-500">El valor se calculará automáticamente como la suma de sus subcategorías.</p>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="addCatBudgeted" className="text-sm font-medium text-slate-700">{p.catMonto}</Label>
                  <Input id="addCatBudgeted" type="number" step="0.01" min="0" value={newCatBudgeted} onChange={(e) => setNewCatBudgeted(e.target.value)} required />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" disabled={submitting}>{submitting ? "Agregando..." : p.agregarRubro}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openSubCat} onOpenChange={(v) => { if (!v) { setOpenSubCat(false); setSubParentId(""); setSubCreateName(""); setSubCreateBudgeted("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva subcategoría</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Agregá una subcategoría a un rubro existente.</p>
          </DialogHeader>
          <form onSubmit={handleSubCatSubmit} className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Rubro padre</Label>
                <select
                  value={subParentId}
                  onChange={(e) => setSubParentId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  required
                >
                  <option value="">Seleccionar rubro</option>
                  {categories.filter((c) => !c.parent_id).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subCreateName" className="text-sm font-medium text-slate-700">{p.catNombre}</Label>
                <Input id="subCreateName" value={subCreateName} onChange={(e) => setSubCreateName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subCreateBudgeted" className="text-sm font-medium text-slate-700">{p.catMonto}</Label>
                <Input id="subCreateBudgeted" type="number" step="0.01" min="0" value={subCreateBudgeted} onChange={(e) => setSubCreateBudgeted(e.target.value)} required />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit" disabled={submitting}>{submitting ? "Agregando..." : "Agregar subcategoría"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteCat} onOpenChange={setOpenDeleteCat}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">¿Eliminar "{deleteCatName}"?</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Esta acción no se puede deshacer.</p>
          </DialogHeader>
          <div className="space-y-4">
            {deleteCatExpenses.length > 0 && (
              <div className="bg-rose-50 rounded-lg p-4">
                <p className="text-xs text-rose-600 mb-2">
                  {deleteCatExpenses.length} gasto{deleteCatExpenses.length !== 1 ? "s" : ""} asociado{deleteCatExpenses.length !== 1 ? "s" : ""} también será{deleteCatExpenses.length !== 1 ? "n" : ""} eliminado{deleteCatExpenses.length !== 1 ? "s" : ""}:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {deleteCatExpenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between px-3 py-1 text-xs rounded bg-white border border-rose-100 text-slate-700">
                      <span className="truncate mr-2">{exp.description || "Sin concepto"}</span>
                      <span className="tabular-nums font-medium text-rose-600">{fmt(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {deleteCatExpenses.length === 0 && (
              <div className="bg-rose-50 rounded-lg p-4 text-sm text-rose-700">
                <p>¿Eliminar la categoría <strong>{deleteCatName}</strong>? No tiene gastos asociados.</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <DialogClose render={<Button variant="outline" size="sm" className="flex-1 text-xs">Cancelar</Button>} />
              <Button variant="destructive" size="sm" className="flex-1 text-xs" onClick={confirmDeleteCategory} disabled={submitting}>{submitting ? "Eliminando..." : "Eliminar todo"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
