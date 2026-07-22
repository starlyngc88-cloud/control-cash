"use client"

import { useEffect, useState } from "react"
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
} from "@/lib/db"
import type { BudgetTemplate, BudgetCategory, MonthlyBudget } from "@/types"
import { Plus, Trash2, Pencil, Calendar, ChevronRight, PiggyBank } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function PresupuestosPage() {
  const [templates, setTemplates] = useState<BudgetTemplate[]>([])
  const [monthlyBudgets, setMonthlyBudgets] = useState<(MonthlyBudget & { budget_templates: Pick<BudgetTemplate, "name"> })[]>([])
  const [categoriesMap, setCategoriesMap] = useState<Record<string, BudgetCategory[]>>({})
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()
  const p = t.presupuestos

  const [openTemplate, setOpenTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [editingTemplate, setEditingTemplate] = useState<BudgetTemplate | null>(null)

  const [openMonth, setOpenMonth] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")

  const [newCatName, setNewCatName] = useState("")
  const [newCatBudgeted, setNewCatBudgeted] = useState("")

  const [openCatEdit, setOpenCatEdit] = useState(false)
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null)
  const [editCatName, setEditCatName] = useState("")
  const [editCatBudgeted, setEditCatBudgeted] = useState("")

  const load = async () => {
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
  }

  useEffect(() => { load() }, [])

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

  const handleAddCategory = async (templateId: string) => {
    if (!newCatName.trim() || !newCatBudgeted) return
    await createBudgetCategory({
      template_id: templateId,
      name: newCatName.trim(),
      budgeted: parseFloat(newCatBudgeted),
    })
    setNewCatName("")
    setNewCatBudgeted("")
    load()
  }

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCat || !editCatName.trim() || !editCatBudgeted) return
    await updateBudgetCategory(editingCat.id, { name: editCatName.trim(), budgeted: parseFloat(editCatBudgeted) })
    setOpenCatEdit(false)
    setEditingCat(null)
    load()
  }

  const handleDeleteCategory = async (id: string) => {
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

  const fmt = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 2 })

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30">
            <PiggyBank className="size-4" />
          </div>
          <h2 className="text-lg font-bold">{p.title}</h2>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{p.plantillas}</span>
          <Button size="sm" className="h-7 text-xs" onClick={() => { setEditingTemplate(null); setTemplateName(""); setOpenTemplate(true) }}>
            <Plus className="size-3 mr-1" />{p.nueva}
          </Button>
        </div>

        {templates.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4">{p.emptyTemplates}</p>
        ) : (
          <div className="divide-y">
            {templates.map((tmpl) => {
              const cats = categoriesMap[tmpl.id] ?? []
              return (
                <div key={tmpl.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{tmpl.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedTemplateId(tmpl.id); setOpenMonth(true) }}>
                        <Calendar className="size-3 mr-1" /> {p.mes}
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingTemplate(tmpl); setTemplateName(tmpl.name); setOpenTemplate(true) }}>
                        <Pencil className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteTemplate(tmpl.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {cats.length > 0 && (
                    <div className="text-xs">
                      {cats.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between py-0.5 px-2 rounded hover:bg-muted/50">
                          <span>{cat.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium tabular-nums">${fmt(cat.budgeted)}</span>
                            <button className="text-muted-foreground hover:text-primary" onClick={() => { setEditingCat(cat); setEditCatName(cat.name); setEditCatBudgeted(String(cat.budgeted)); setOpenCatEdit(true) }}>
                              <Pencil className="size-2.5" />
                            </button>
                            <button className="text-muted-foreground hover:text-red-600" onClick={() => handleDeleteCategory(cat.id)}>
                              <Trash2 className="size-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <input
                      placeholder={p.rubroPlaceholder}
                      className="h-7 px-2 text-xs rounded border border-input bg-transparent flex-1 min-w-0 outline-none focus:border-ring"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                    />
                    <input
                      type="number" step="0.01" min="0"
                      placeholder={p.montoPlaceholder}
                      className="h-7 px-2 text-xs rounded border border-input bg-transparent w-24 outline-none focus:border-ring tabular-nums"
                      value={newCatBudgeted}
                      onChange={(e) => setNewCatBudgeted(e.target.value)}
                    />
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => handleAddCategory(tmpl.id)}>
                      <Plus className="size-3 mr-0.5" /> {p.agregarRubro}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-muted/30 border-b">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{p.mesesFinancieros}</span>
        </div>
        {monthlyBudgets.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4">{p.emptyMonths}</p>
        ) : (
          <div className="divide-y">
            {monthlyBudgets.map((mb) => (
              <div key={mb.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                <div className="min-w-0">
                  <span className="text-sm font-medium capitalize">{formatMonth(mb.month)}</span>
                  <span className="text-xs text-muted-foreground ml-2">· {mb.budget_templates?.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/presupuestos/${mb.id}`} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded border border-input hover:bg-accent transition-colors">
                    {p.verDetalle} <ChevronRight className="size-3" />
                  </Link>
                  <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteMonth(mb.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
            <div className="space-y-2">
              <Label htmlFor="catBudgeted">{p.catMonto}</Label>
              <Input id="catBudgeted" type="number" step="0.01" min="0" value={editCatBudgeted} onChange={(e) => setEditCatBudgeted(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">{p.catGuardarCambios}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openMonth} onOpenChange={setOpenMonth}>
        <DialogContent>
          <DialogHeader><DialogTitle>{p.newMonthTitle}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateMonth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="month">{p.mesLabel}</Label>
              <Input id="month" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} required />
            </div>
            {selectedTemplateId && categoriesMap[selectedTemplateId]?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{p.rubrosLabel}</p>
                {categoriesMap[selectedTemplateId].map((cat) => (
                  <div key={cat.id} className="flex justify-between text-xs px-2.5 py-1 rounded bg-muted/50">
                    <span>{cat.name}</span>
                    <span className="font-medium tabular-nums">${fmt(cat.budgeted)}</span>
                  </div>
                ))}
              </div>
            )}
            <Button type="submit" className="w-full">{p.crearMes}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
