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
  updateBudgetTemplate,
  deleteBudgetTemplate,
  getBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  getMonthlyBudgets,
  createMonthlyBudget,
  deleteMonthlyBudget,
  buildCategoryTree,
} from "@/lib/db"
import type { BudgetTemplate, BudgetCategory, MonthlyBudget } from "@/types"
import { Plus, Trash2, Pencil, Calendar, ChevronRight, ChevronDown, PiggyBank, FolderDown } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function PresupuestosPage() {
  const [templates, setTemplates] = useState<BudgetTemplate[]>([])
  const [monthlyBudgets, setMonthlyBudgets] = useState<(MonthlyBudget & { budget_templates: Pick<BudgetTemplate, "name"> })[]>([])
  const [categoriesMap, setCategoriesMap] = useState<Record<string, BudgetCategory[]>>({})
  const [loading, setLoading] = useState(true)
  const { t, fmt } = useLanguage()
  const p = t.presupuestos

  const [openTemplate, setOpenTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [editingTemplate, setEditingTemplate] = useState<BudgetTemplate | null>(null)

  const [openMonth, setOpenMonth] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")

  const [openCatEdit, setOpenCatEdit] = useState(false)
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null)
  const [editCatName, setEditCatName] = useState("")
  const [editCatBudgeted, setEditCatBudgeted] = useState("")
  const [editCatHasChildren, setEditCatHasChildren] = useState(false)
  const [editCatHasSub, setEditCatHasSub] = useState(false)

  // Per-parent inline add subcategory state
  const [addingSub, setAddingSub] = useState<string | null>(null)
  const [subCatName, setSubCatName] = useState("")
  const [subCatBudgeted, setSubCatBudgeted] = useState("")

  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  const toggleParent = (id: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const load = useCallback(async () => {
    const [t, m] = await Promise.all([getBudgetTemplates(), getMonthlyBudgets()])
    setTemplates(t)
    setMonthlyBudgets(m)
    const cm: Record<string, BudgetCategory[]> = {}
    await Promise.all(
      t.map(async (tmpl) => {
        const cats = await getBudgetCategories(tmpl.id)
        cm[tmpl.id] = cats
      })
    )
    setCategoriesMap(cm)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateName.trim()) return
    if (editingTemplate) {
      await updateBudgetTemplate(editingTemplate.id, { name: templateName.trim() })
    } else {
      await createBudgetTemplate(templateName.trim())
    }
    setOpenTemplate(false)
    setEditingTemplate(null)
    setTemplateName("")
    load()
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(p.deleteTemplateConfirm)) return
    await deleteBudgetTemplate(id)
    load()
  }

  const handleAddCategory = async (templateId: string, name: string, budgeted: string, parentId: string | null) => {
    if (!name.trim() || !budgeted) return
    await createBudgetCategory({
      template_id: templateId,
      name: name.trim(),
      budgeted: parseFloat(budgeted),
      parent_id: parentId,
    })
    setAddingSub(null)
    setSubCatName("")
    setSubCatBudgeted("")
    load()
  }

  const [openNewCat, setOpenNewCat] = useState(false)
  const [newCatTemplateId, setNewCatTemplateId] = useState("")
  const [newCatName, setNewCatName] = useState("")
  const [newCatBudgeted, setNewCatBudgeted] = useState("")
  const [newCatHasSub, setNewCatHasSub] = useState(false)

  const handleAddParentCategory = async (templateId: string) => {
    setNewCatTemplateId(templateId)
    setNewCatName("")
    setNewCatBudgeted("")
    setNewCatHasSub(false)
    setOpenNewCat(true)
  }

  const handleSubmitNewParentCat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    if (!newCatHasSub && !newCatBudgeted) return
    await createBudgetCategory({
      template_id: newCatTemplateId,
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

  const handleDeleteCategory = async (id: string, parentId: string | null) => {
    if (parentId === null) {
      const children = categoriesMap[Object.keys(categoriesMap).find(k => categoriesMap[k].some(c => c.parent_id === id)) ? "" : ""]
    }
    await deleteBudgetCategory(id)
    load()
  }

  const handleCreateMonth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplateId || !selectedMonth) return
    const firstDay = selectedMonth + "-01"
    await createMonthlyBudget({ template_id: selectedTemplateId, month: firstDay })
    setOpenMonth(false)
    setSelectedTemplateId("")
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

  return (
    <div className="-mx-6 -mt-6 p-6 min-h-[calc(100vh-3rem)] bg-gradient-to-b from-transparent to-muted/20">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30">
            <PiggyBank className="size-4" />
          </div>
          <h2 className="text-lg font-bold">{p.title}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Templates column */}
        <div className="lg:col-span-2 space-y-4">
          {templates.length === 0 ? (
            <div className="border rounded-lg p-6 text-center">
              <p className="text-xs text-muted-foreground mb-3">{p.emptyTemplates}</p>
              <Button size="sm" className="h-7 text-xs" onClick={() => { setEditingTemplate(null); setTemplateName(""); setOpenTemplate(true) }}>
                <Plus className="size-3 mr-1" />{p.nueva} {p.plantillas.toLowerCase()}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((tmpl) => {
                const allCats = categoriesMap[tmpl.id] ?? []
                const parents = buildCategoryTree(allCats)
                const hasSubCat = allCats.some(c => c.parent_id !== null)
                return (
                  <div key={tmpl.id} className="border rounded-lg overflow-hidden bg-background">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b">
                      <span className="text-sm font-semibold">{tmpl.name}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="h-6 text-[11px]" onClick={() => { setSelectedTemplateId(tmpl.id); setOpenMonth(true) }}>
                          <Calendar className="size-3 mr-1" /> {p.mes}
                        </Button>
                        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-primary" onClick={() => { setEditingTemplate(tmpl); setTemplateName(tmpl.name); setOpenTemplate(true) }}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteTemplate(tmpl.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>

                    {allCats.length > 0 && (
                      <div className="text-xs">
                        {parents.map((parent) => (
                          <div key={parent.id}>
                            <div className="flex items-center gap-1 py-1 px-2 hover:bg-muted/30 bg-muted/5 border-t border-border/50 first:border-t-0">
                              <button onClick={() => toggleParent(parent.id)} className="p-0.5 rounded hover:bg-accent text-muted-foreground shrink-0">
                                {parent.children.length > 0 ? (
                                  expandedParents.has(parent.id) ? <ChevronDown className="size-2.5" /> : <ChevronRight className="size-2.5" />
                                ) : (
                                  <span className="size-2.5 block" />
                                )}
                              </button>
                              <span className="font-medium truncate min-w-0 flex-1">{parent.name}</span>
                              {parent.children.length > 0 ? (
                                <span className="tabular-nums shrink-0">{fmt(parent.children.reduce((s, c) => s + c.budgeted, 0))}</span>
                              ) : (
                                <span className="tabular-nums shrink-0">{fmt(parent.budgeted)}</span>
                              )}
                              <button className="text-muted-foreground hover:text-primary shrink-0" title="Subcategoría" onClick={() => { setAddingSub(addingSub === parent.id ? null : parent.id); setSubCatName(""); setSubCatBudgeted("") }}>
                                <FolderDown className="size-2.5" />
                              </button>
                              <button className="text-muted-foreground hover:text-primary shrink-0" onClick={() => { setEditingCat(parent); setEditCatName(parent.name); setEditCatBudgeted(String(parent.budgeted)); setOpenCatEdit(true); setEditCatHasChildren(parent.children.length > 0); setEditCatHasSub(parent.children.length > 0 || parent.budgeted === 0) }}>
                                <Pencil className="size-2.5" />
                              </button>
                              <button className="text-muted-foreground hover:text-red-600 shrink-0" onClick={() => handleDeleteCategory(parent.id, null)}>
                                <Trash2 className="size-2.5" />
                              </button>
                            </div>

                            {parent.children.length > 0 && expandedParents.has(parent.id) && parent.children.map((child) => (
                              <div key={child.id} className="flex items-center gap-1 py-0.5 px-2 pl-6 hover:bg-muted/20 border-t border-dashed border-border/30">
                                <span className="truncate min-w-0 flex-1 text-muted-foreground">└ {child.name}</span>
                                <span className="tabular-nums shrink-0">{fmt(child.budgeted)}</span>
                                <button className="text-muted-foreground hover:text-primary shrink-0" onClick={() => { setEditingCat(child); setEditCatName(child.name); setEditCatBudgeted(String(child.budgeted)); setOpenCatEdit(true) }}>
                                  <Pencil className="size-2.5" />
                                </button>
                                <button className="text-muted-foreground hover:text-red-600 shrink-0" onClick={() => handleDeleteCategory(child.id, parent.id)}>
                                  <Trash2 className="size-2.5" />
                                </button>
                              </div>
                            ))}

                            {addingSub === parent.id && (
                              <div className="flex items-center gap-1 px-2 py-1 border-t border-dashed bg-muted/5">
                                <input
                                  placeholder="Sub"
                                  className="h-6 px-1.5 text-[11px] rounded border border-input bg-transparent flex-1 min-w-0 outline-none focus:border-ring"
                                  value={subCatName}
                                  onChange={(e) => setSubCatName(e.target.value)}
                                  autoFocus
                                />
                                <input
                                  type="number" step="0.01" min="0"
                                  placeholder="$"
                                  className="h-6 px-1.5 text-[11px] rounded border border-input bg-transparent w-16 outline-none focus:border-ring tabular-nums"
                                  value={subCatBudgeted}
                                  onChange={(e) => setSubCatBudgeted(e.target.value)}
                                />
                                <button className="text-primary hover:text-primary/80 shrink-0" onClick={() => handleAddCategory(tmpl.id, subCatName, subCatBudgeted, parent.id)}>
                                  <Plus className="size-3" />
                                </button>
                                <button className="text-muted-foreground hover:text-foreground shrink-0" onClick={() => setAddingSub(null)}>
                                  <span className="text-[11px]">✕</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-border/50">
                      <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground w-full px-2 py-1 hover:bg-muted/30" onClick={() => handleAddParentCategory(tmpl.id)}>
                        <Plus className="size-2.5" /> {p.agregarRubro}
                      </button>
                    </div>
                  </div>
                )
              })}
              <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => { setEditingTemplate(null); setTemplateName(""); setOpenTemplate(true) }}>
                <Plus className="size-3 mr-1" />{p.nueva} {p.plantillas.toLowerCase()}
              </Button>
            </div>
          )}
        </div>

        {/* Monthly budgets column */}
        <div className="space-y-3">
          <div className="border rounded-lg overflow-hidden bg-background">
            <div className="px-3 py-2 bg-muted/20 border-b">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{p.mesesFinancieros}</span>
            </div>
            {monthlyBudgets.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4">{p.emptyMonths}</p>
            ) : (
              <div className="divide-y">
                {monthlyBudgets.map((mb) => (
                  <div key={mb.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/20">
                    <div className="min-w-0">
                      <span className="text-sm font-medium capitalize block leading-tight">{formatMonth(mb.month)}</span>
                      <span className="text-[11px] text-muted-foreground">· {mb.budget_templates?.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/presupuestos/${mb.id}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded border border-input hover:bg-accent transition-colors">
                        {p.verDetalle} <ChevronRight className="size-3" />
                      </Link>
                      <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteMonth(mb.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={openTemplate} onOpenChange={(v) => { if (!v) setEditingTemplate(null); setOpenTemplate(v) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTemplate ? p.editTemplateTitle : p.newTemplateTitle}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{p.nombre}</Label>
              <Input id="name" placeholder={p.nombrePlaceholder} value={templateName} onChange={(e) => setTemplateName(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">{editingTemplate ? p.guardarCambios : p.crearPlantilla}</Button>
          </form>
        </DialogContent>
      </Dialog>

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
            {selectedTemplateId && categoriesMap[selectedTemplateId]?.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-px text-xs">
                <p className="text-[10px] text-muted-foreground sticky top-0 bg-background pb-0.5">{p.rubrosLabel}</p>
                {categoriesMap[selectedTemplateId].filter(c => !c.parent_id).map((cat) => {
                  const children = categoriesMap[selectedTemplateId].filter(c => c.parent_id === cat.id)
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
    </div>
  )
}
