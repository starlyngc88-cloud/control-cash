"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
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

export default function PresupuestosPage() {
  const [template, setTemplate] = useState<BudgetTemplate | null>(null)
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [monthlyBudgets, setMonthlyBudgets] = useState<(MonthlyBudget & { budget_templates: Pick<BudgetTemplate, "name"> })[]>([])
  const [loading, setLoading] = useState(true)
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
  }

  const handleSubmitNewParentCat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!template || !newCatName.trim()) return
    if (!newCatHasSub && !newCatBudgeted) return
    await createBudgetCategory({
      template_id: template.id,
      name: newCatName.trim(),
      budgeted: newCatHasSub ? 0 : parseFloat(newCatBudgeted),
      parent_id: null,
    })
    setOpenNewCat(false)
    load()
  }

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCat || !editCatName.trim()) return
    if (editCatHasChildren || editCatHasSub) {
      await updateBudgetCategory(editingCat.id, { name: editCatName.trim(), budgeted: 0 })
    } else {
      await updateBudgetCategory(editingCat.id, { name: editCatName.trim(), budgeted: parseFloat(editCatBudgeted || "0") })
    }
    setOpenCatEdit(false)
    setEditingCat(null)
    load()
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    const { data: expenses } = await supabase.from("expenses").select("*").eq("budget_category_id", id)
    if (expenses && expenses.length > 0) {
      setDeleteCatId(id)
      setDeleteCatName(name)
      setDeleteCatExpenses(expenses)
      setOpenDeleteCat(true)
    } else {
      await deleteBudgetCategory(id)
      load()
    }
  }

  const confirmDeleteCategory = async () => {
    for (const exp of deleteCatExpenses) {
      await supabase.from("expenses").delete().eq("id", exp.id)
    }
    await deleteBudgetCategory(deleteCatId)
    setOpenDeleteCat(false)
    setDeleteCatExpenses([])
    setDeleteCatId("")
    load()
  }

  const handleCreateMonth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!template || !selectedMonth) return
    const firstDay = selectedMonth + "-01"
    await createMonthlyBudget({ template_id: template.id, month: firstDay })
    setOpenMonth(false)
    setSelectedMonth("")
    load()
  }

  const handleDeleteMonth = async (id: string) => {
    if (!confirm(p.deleteMonthConfirm)) return
    await deleteMonthlyBudget(id)
    load()
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
    <div className="-mx-6 -mt-6 p-6 min-h-[calc(100vh-3rem)] bg-gradient-to-b from-transparent to-muted/20">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30">
            <PiggyBank className="size-5" />
          </div>
          <h2 className="text-xl font-bold">{template.name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Categories */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded-lg overflow-hidden bg-background">
            {allCats.length > 0 && (
              <>
              <div className="flex items-center justify-between px-3 py-1 border-b bg-muted/10">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rubros</span>
                <button
                  onClick={() => {
                    if (expandedParents.size === parents.filter(p => p.children.length > 0).length) {
                      setExpandedParents(new Set())
                    } else {
                      setExpandedParents(new Set(parents.filter(p => p.children.length > 0).map(p => p.id)))
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  {expandedParents.size === parents.filter(p => p.children.length > 0).length ? "Contraer todo" : "Expandir todo"}
                </button>
              </div>
              <div className="text-sm">
                {parents.map((parent) => {
                  const isExpanded = expandedParents.has(parent.id)
                  return (
                  <div key={parent.id}>
                    <div className={`flex items-center py-0.5 px-1.5 transition-colors ${isExpanded ? "bg-yellow-100/50" : "hover:bg-yellow-100 bg-muted/5"} border-t border-border/50 first:border-t-0`}>
                      <button onClick={() => toggleParent(parent.id)} className="p-0.5 rounded hover:bg-accent text-gray-400 hover:text-gray-600 shrink-0">
                        {parent.children.length > 0 ? (
                          isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />
                        ) : (
                          <span className="size-3.5 block" />
                        )}
                      </button>
                      <button className="text-cyan-500 hover:text-cyan-700 shrink-0 ml-0.5" title="Subcategoría" onClick={() => { setAddingSub(addingSub === parent.id ? null : parent.id); setSubCatName(""); setSubCatBudgeted("") }}>
                        <FolderDown className="size-3.5" />
                      </button>
                      <button className="text-blue-500 hover:text-blue-700 shrink-0 ml-0.5" onClick={() => { setEditingCat(parent); setEditCatName(parent.name); setEditCatBudgeted(String(parent.budgeted)); setOpenCatEdit(true); setEditCatHasChildren(parent.children.length > 0); setEditCatHasSub(parent.children.length > 0 || parent.budgeted === 0) }}>
                        <Pencil className="size-3.5" />
                      </button>
                      <button className="text-red-400 hover:text-red-600 shrink-0 ml-0.5" onClick={() => handleDeleteCategory(parent.id, parent.name)}>
                        <Trash2 className="size-3.5" />
                      </button>
                      <span className="font-medium truncate min-w-0">{parent.name}</span>
                      <span className="tabular-nums shrink-0 ml-auto font-semibold">
                        {parent.children.length > 0 ? fmt(parent.children.reduce((s, c) => s + c.budgeted, 0)) : fmt(parent.budgeted)}
                      </span>
                    </div>

                    {parent.children.length > 0 && isExpanded && parent.children.map((child) => (
                      <div key={child.id} className="flex items-center py-0.5 pl-8 pr-1.5 hover:bg-yellow-50/70 border-t border-dashed border-border/30">
                        <span className="truncate min-w-0 text-muted-foreground">└ {child.name}</span>
                        <span className="tabular-nums shrink-0 text-muted-foreground ml-auto">{fmt(child.budgeted)}</span>
                        <button className="text-blue-500 hover:text-blue-700 shrink-0 ml-1" onClick={() => { setEditingCat(child); setEditCatName(child.name); setEditCatBudgeted(String(child.budgeted)); setOpenCatEdit(true) }}>
                          <Pencil className="size-3.5" />
                        </button>
                        <button className="text-red-400 hover:text-red-600 shrink-0 ml-0.5" onClick={() => handleDeleteCategory(child.id, child.name)}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}

                    {addingSub === parent.id && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 border-t border-dashed bg-muted/5">
                        <input
                          placeholder="Sub"
                          className="h-7 px-1.5 text-sm rounded border border-input bg-transparent flex-1 min-w-0 outline-none focus:border-ring"
                          value={subCatName}
                          onChange={(e) => setSubCatName(e.target.value)}
                          autoFocus
                        />
                        <input
                          type="number" step="0.01" min="0"
                          placeholder="$"
                          className="h-7 px-1.5 text-sm rounded border border-input bg-transparent w-20 outline-none focus:border-ring tabular-nums"
                          value={subCatBudgeted}
                          onChange={(e) => setSubCatBudgeted(e.target.value)}
                        />
                        <button className="text-primary hover:text-primary/80 shrink-0" onClick={() => handleAddCategory(subCatName, subCatBudgeted, parent.id)}>
                          <Plus className="size-3.5" />
                        </button>
                        <button className="text-muted-foreground hover:text-foreground shrink-0" onClick={() => setAddingSub(null)}>
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
              <div className="flex items-center justify-between px-1.5 py-0.5 border-t border-border/50 bg-yellow-100/30 text-sm">
                <span className="font-semibold">Total</span>
                <span className="tabular-nums font-semibold">
                  {fmt(allCats.filter(c => !c.parent_id).reduce((s, p) => {
                    const children = allCats.filter(ch => ch.parent_id === p.id)
                    return s + (children.length > 0 ? children.reduce((cs, ch) => cs + ch.budgeted, 0) : p.budgeted)
                  }, 0))}
                </span>
              </div>
            )}

            <div className="border-t border-border/50">
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-full px-1.5 py-0.5 hover:bg-muted/30" onClick={() => setOpenNewCat(true)}>
                <Plus className="size-3.5" /> {p.agregarRubro}
              </button>
            </div>
          </div>
        </div>

        {/* Monthly budgets */}
        <div className="space-y-3">
          <div className="border rounded-lg overflow-hidden bg-background">
            <div className="px-3 py-2 bg-muted/20 border-b">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{p.mesesFinancieros}</span>
            </div>
            {monthlyBudgets.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">{p.emptyMonths}</p>
            ) : (
              <div className="divide-y">
                {monthlyBudgets.map((mb) => (
                  <div key={mb.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/20">
                    <div className="min-w-0">
                      <span className="text-base font-medium capitalize block leading-tight">{formatMonth(mb.month)}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/presupuestos/${mb.id}`} className="inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded border border-input hover:bg-accent transition-colors">
                        {p.verDetalle} <ChevronRight className="size-3.5 text-gray-400" />
                      </Link>
                      <Button variant="ghost" size="icon" className="size-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteMonth(mb.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-border/50">
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-full px-1.5 py-0.5 hover:bg-muted/30" onClick={() => setOpenMonth(true)}>
                <Calendar className="size-3.5 text-violet-500" /> {p.mes}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={openCatEdit} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCatEdit(v) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{p.editCategoryTitle}</DialogTitle></DialogHeader>
          <form onSubmit={handleEditCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catName">{p.catNombre}</Label>
              <Input id="catName" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} required />
            </div>
            {editCatHasChildren ? (
              <div className="space-y-2">
                <Label>{p.catMonto}</Label>
                <p className="text-xs text-muted-foreground">Calculado automáticamente de las subcategorías</p>
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCatHasSub}
                    onChange={(e) => { setEditCatHasSub(e.target.checked); if (e.target.checked) setEditCatBudgeted("0") }}
                    className="accent-primary"
                  />
                  Tiene subcategorías
                </label>
                {editCatHasSub ? (
                  <p className="text-xs text-muted-foreground">El valor se calculará automáticamente como la suma de sus subcategorías.</p>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="catBudgeted">{p.catMonto}</Label>
                    <Input id="catBudgeted" type="number" step="0.01" min="0" value={editCatBudgeted} onChange={(e) => setEditCatBudgeted(e.target.value)} required />
                  </div>
                )}
              </>
            )}
            <Button type="submit" className="w-full">{p.catGuardarCambios}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openMonth} onOpenChange={setOpenMonth}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{p.newMonthTitle}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Seleccioná el mes y año que querés abrir.</p>
          </DialogHeader>
          <form onSubmit={handleCreateMonth} className="space-y-4">
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
            {allCats.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-px text-xs">
                <p className="text-[10px] text-muted-foreground sticky top-0 bg-background pb-0.5">{p.rubrosLabel}</p>
                {allCats.filter(c => !c.parent_id).map((cat) => {
                  const children = allCats.filter(c => c.parent_id === cat.id)
                  const parentTotal = children.length > 0 ? children.reduce((s, c) => s + c.budgeted, 0) : cat.budgeted
                  return (
                    <div key={cat.id}>
                      <div className="flex justify-between text-[11px] px-2 py-0.5 rounded bg-muted/50 font-medium">
                        <span className="truncate mr-2">{cat.name}</span>
                        <span className="tabular-nums shrink-0">{fmt(parentTotal)}</span>
                      </div>
                      {children.map((child) => (
                        <div key={child.id} className="flex justify-between text-[11px] pl-4 pr-2 py-0.5 text-muted-foreground">
                          <span className="truncate mr-2">└ {child.name}</span>
                          <span className="tabular-nums shrink-0">{fmt(child.budgeted)}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
            <Button type="submit" size="sm" className="w-full text-xs h-7">{p.crearMes}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openNewCat} onOpenChange={setOpenNewCat}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo rubro</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitNewParentCat} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addCatName">{p.catNombre}</Label>
              <Input id="addCatName" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={newCatHasSub}
                onChange={(e) => setNewCatHasSub(e.target.checked)}
                className="accent-primary"
              />
              Tiene subcategorías
            </label>
            {newCatHasSub ? (
              <p className="text-xs text-muted-foreground">El valor se calculará automáticamente como la suma de sus subcategorías.</p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="addCatBudgeted">{p.catMonto}</Label>
                <Input id="addCatBudgeted" type="number" step="0.01" min="0" value={newCatBudgeted} onChange={(e) => setNewCatBudgeted(e.target.value)} required />
              </div>
            )}
            <Button type="submit" className="w-full">{p.agregarRubro}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteCat} onOpenChange={setOpenDeleteCat}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">¿Eliminar "{deleteCatName}"?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {deleteCatExpenses.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {deleteCatExpenses.length} gasto{deleteCatExpenses.length !== 1 ? "s" : ""} asociado{deleteCatExpenses.length !== 1 ? "s" : ""} también será{deleteCatExpenses.length !== 1 ? "n" : ""} eliminado{deleteCatExpenses.length !== 1 ? "s" : ""}:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-0.5 text-xs">
                  {deleteCatExpenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between px-2 py-0.5 rounded bg-muted/30">
                      <span className="truncate mr-2">{exp.description || "Sin concepto"}</span>
                      <span className="tabular-nums shrink-0">{fmt(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setOpenDeleteCat(false)}>Cancelar</Button>
              <Button variant="destructive" size="sm" className="flex-1 text-xs" onClick={confirmDeleteCategory}>Eliminar todo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
