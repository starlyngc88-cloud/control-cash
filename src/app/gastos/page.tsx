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
import { getExpenses, createExpense, updateExpense, deleteExpense, getPeople, getBudgetTemplates, getBudgetCategories, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory, buildCategoryTree } from "@/lib/db"
import type { CategoryTreeNode } from "@/lib/db"
import type { Person, Expense, BudgetCategory } from "@/types"
import { Plus, Trash2, Pencil, ArrowUpCircle, ChevronDown, ChevronRight, List } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function GastosPage() {
  const [expenses, setExpenses] = useState<(Expense & { people: Pick<Person, "name"> | null; budget_categories: Pick<BudgetCategory, "id" | "name" | "template_id" | "budgeted"> | null })[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const { t, fmt } = useLanguage()
  const g = t.gastos

  const [personId, setPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [budgetCatId, setBudgetCatId] = useState("")

  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const [openCat, setOpenCat] = useState(false)
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null)
  const [catName, setCatName] = useState("")

  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null)
  const [catDeleteExpenses, setCatDeleteExpenses] = useState<Expense[]>([])

  const load = async () => {
    const [e, p, templates] = await Promise.all([getExpenses(), getPeople(), getBudgetTemplates()])
    const base = templates.find((t) => t.name.toLowerCase() === "modelo base")
    const bc = base ? await getBudgetCategories(base.id) : []
    setExpenses(e)
    setPeople(p)
    setBudgetCategories(bc)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setPersonId("")
    setAmount("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setBudgetCatId("")
    setOpen(true)
  }

  const openEdit = (exp: Expense & { people: Pick<Person, "name"> | null; budget_categories: any }) => {
    setEditing(exp)
    setPersonId(exp.person_id)
    setAmount(String(exp.amount))
    setDescription(exp.description)
    setDate(exp.date)
    setBudgetCatId(exp.budget_category_id ?? "")
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId || !amount) return
    const data = {
      person_id: personId,
      amount: parseFloat(amount),
      description,
      date,
      budget_category_id: budgetCatId || null,
    }
    if (editing) {
      await updateExpense(editing.id, data)
    } else {
      await createExpense(data)
    }
    setOpen(false)
    setEditing(null)
    setPersonId("")
    setAmount("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
    setBudgetCatId("")
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(g.deleteConfirm)) return
    await deleteExpense(id)
    load()
  }

  const openNewCat = () => {
    setEditingCat(null)
    setCatName("")
    setOpenCat(true)
  }

  const openEditCat = (cat: BudgetCategory) => {
    setEditingCat(cat)
    setCatName(cat.name)
    setOpenCat(true)
  }

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return
    const templates = await getBudgetTemplates()
    const base = templates.find((t) => t.name.toLowerCase() === "modelo base")
    if (!base) return
    if (editingCat) {
      await updateBudgetCategory(editingCat.id, { name: catName.trim(), budgeted: editingCat.budgeted })
    } else {
      await createBudgetCategory({ template_id: base.id, name: catName.trim(), budgeted: 0, parent_id: null })
    }
    setOpenCat(false)
    setEditingCat(null)
    load()
  }

  const handleDeleteCat = async (catId: string, catName: string) => {
    const related = expenses.filter((e) => e.budget_category_id === catId)
    if (related.length > 0) {
      setCatDeleteExpenses(related)
      setCatToDelete({ id: catId, name: catName })
    } else {
      await deleteBudgetCategory(catId)
      load()
    }
  }

  const confirmDeleteCat = async () => {
    if (!catToDelete) return
    for (const exp of catDeleteExpenses) {
      await deleteExpense(exp.id)
    }
    await deleteBudgetCategory(catToDelete.id)
    setCatToDelete(null)
    setCatDeleteExpenses([])
    load()
  }

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; name: string; items: typeof expenses }>()
    for (const cat of budgetCategories.filter((c) => !c.parent_id)) {
      map.set(cat.id, { id: cat.id, name: cat.name, items: [] })
    }
    map.set("__none__", { id: "__none__", name: "Sin categoría", items: [] })
    for (const exp of expenses) {
      const key = exp.budget_category_id ?? "__none__"
      const group = map.get(key)
      if (group) {
        group.items.push(exp)
      } else {
        const cat = budgetCategories.find((c) => c.id === key)
        if (cat) {
          const parent = budgetCategories.find((c) => c.id === cat.parent_id)
          const parentKey = parent?.id ?? "__none__"
          const parentGroup = map.get(parentKey)
          if (parentGroup) parentGroup.items.push(exp)
          else map.get("__none__")?.items.push(exp)
        } else {
          map.get("__none__")?.items.push(exp)
        }
      }
    }
    return Array.from(map.entries()).filter(([, v]) => v.items.length > 0 || v.id === "__none__")
  }, [expenses, budgetCategories])

  const allExpanded = grouped.length > 0 && grouped.every(([k]) => expandedCats.has(k))

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const sinCategoria = expenses.filter((e) => !e.budget_category_id).length
  const masAlto = expenses.reduce((max, e) => Number(e.amount) > Number(max.amount) ? e : max, expenses[0] ?? null)

  const catGastos = new Map<string, number>()
  const catGastosId = new Map<string, number>()
  for (const e of expenses) {
    const key = e.budget_category_id ?? "__none__"
    catGastosId.set(key, (catGastosId.get(key) ?? 0) + Number(e.amount))
  }

  const topCatEntry = [...catGastosId.entries()]
    .filter(([id]) => id !== "__none__")
    .map(([id, amount]) => {
      const cat = budgetCategories.find((c) => c.id === id)
      return { id, name: cat?.name ?? "?", amount, budgeted: cat?.budgeted ?? 0 }
    })
    .sort((a, b) => b.amount - a.amount)

  const topCat = topCatEntry[0] ?? null
  const sobre = topCatEntry.filter((c) => c.amount > c.budgeted && c.budgeted > 0)
  const totalPresupuestado = budgetCategories.reduce((s, c) => s + Number(c.budgeted), 0)

  return (
    <div className="-mx-6 -mt-6 p-6 min-h-[calc(100vh-3rem)] bg-gradient-to-b from-transparent to-muted/20">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30">
            <ArrowUpCircle className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{g.title}</h2>
            <p className="text-sm text-muted-foreground">{g.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={openCat} onOpenChange={(v) => { if (!v) setEditingCat(null); setOpenCat(v) }}>
            <DialogTrigger render={(props) => <Button {...props} variant="outline" onClick={openNewCat}><List className="size-4 mr-2" />Categoría</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>{editingCat ? "Editar categoría" : "Nueva categoría"}</DialogTitle></DialogHeader>
              <form onSubmit={handleCatSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="catName">Nombre</Label>
                  <Input id="catName" value={catName} onChange={(e) => setCatName(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">{editingCat ? "Guardar cambios" : "Crear categoría"}</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog key={editing?.id ?? 'new'} open={open} onOpenChange={(v) => { if (!v) setEditing(null); setOpen(v) }}>
            <DialogTrigger render={(props) => <Button {...props} onClick={openNew}><Plus className="size-4 mr-2" />{g.newGasto}</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? g.editTitle : g.newTitle}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="persona">{g.persona}</Label>
                  <select
                    id="persona"
                    value={personId}
                    onChange={(e) => setPersonId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                    required
                  >
                    <option value="" disabled>{g.selectPersona}</option>
                    {people.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">{g.monto}</Label>
                  <Input id="amount" type="number" step="0.01" min="0.01" placeholder={g.montoPlaceholder} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{g.concepto}</Label>
                  <Input id="description" placeholder={g.conceptoPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">{g.fecha}</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">{g.rubro}</Label>
                  <select
                    id="category"
                    value={budgetCatId}
                    onChange={(e) => setBudgetCatId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  >
                    <option value="">{g.sinRubro}</option>
                    {(() => {
                      const tree = buildCategoryTree(budgetCategories)
                      const flat: { id: string; name: string; depth: number }[] = []
                      const walk = (nodes: CategoryTreeNode[], depth: number) => {
                        for (const n of nodes) {
                          flat.push({ id: n.id, name: n.name, depth })
                          walk(n.children, depth + 1)
                        }
                      }
                      walk(tree, 0)
                      return flat.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {"\u00A0".repeat(cat.depth * 4)}{cat.depth > 0 ? "— " : ""}{cat.name}
                        </option>
                      ))
                    })()}
                  </select>
                </div>
                <Button type="submit" className="w-full">{editing ? g.guardarCambios : g.guardar}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card title="Suma de todos los gastos registrados" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total gastado</CardTitle>
            <ArrowUpCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{fmt(total)}</div>
            {totalPresupuestado > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {total > totalPresupuestado ? (
                  <span className="text-red-500 font-medium">{(total / totalPresupuestado * 100 - 100).toFixed(0)}% sobre presupuesto</span>
                ) : (
                  <span className="text-green-600">{(100 - total / totalPresupuestado * 100).toFixed(0)}% disponible</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        {masAlto && (
          <Card title="El gasto individual más alto registrado" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium truncate">Gasto récord</CardTitle>
              <ArrowUpCircle className="size-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{fmt(Number(masAlto.amount))}</div>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{masAlto.description || "Sin concepto"}</p>
            </CardContent>
          </Card>
        )}

        {topCat ? (
          <Card title="Categoría con mayor gasto acumulado" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium truncate">Categoría top</CardTitle>
              <ArrowUpCircle className="size-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{fmt(topCat.amount)}</div>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{topCat.name}</p>
              {topCat.budgeted > 0 && (
                <p className={`text-[10px] mt-0.5 ${topCat.amount > topCat.budgeted ? "text-red-500 font-medium" : "text-green-600"}`}>
                  {topCat.amount > topCat.budgeted
                    ? `${(topCat.amount / topCat.budgeted * 100 - 100).toFixed(0)}% sobre presupuesto`
                    : `Usado ${(topCat.amount / topCat.budgeted * 100).toFixed(0)}% del presupuesto`
                  }
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {sobre.length > 0 ? (
          <Card title="Categorías que excedieron su presupuesto" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-red-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-600">¡Sobre presupuesto!</CardTitle>
              <ArrowUpCircle className="size-4 text-red-500" />
            </CardHeader>
            <CardContent className="space-y-0.5">
              {sobre.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-muted-foreground">{c.name}</span>
                  <span className="tabular-nums shrink-0 ml-1 font-medium text-red-500">+{fmt(c.amount - c.budgeted)}</span>
                </div>
              ))}
              {sobre.length > 3 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">+{sobre.length - 3} más</p>
              )}
            </CardContent>
          </Card>
        ) : sinCategoria > 0 ? (
          <Card title="Gastos sin categoría asignada" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-500">Sin categoría</CardTitle>
              <ArrowUpCircle className="size-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{sinCategoria}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">gastos sin clasificar</p>
            </CardContent>
          </Card>
        ) : (
          <Card title="Todos los gastos tienen categoría" className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Categorizado</CardTitle>
              <ArrowUpCircle className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">100%</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">todo clasificado</p>
            </CardContent>
          </Card>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="border rounded-lg bg-background p-6 text-center">
          <p className="text-sm text-muted-foreground">{g.empty}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-background">
          <div className="flex items-center justify-between px-3 py-1 border-b bg-muted/10">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gastos por categoría</span>
            <button
              onClick={() => {
                if (allExpanded) {
                  setExpandedCats(new Set())
                } else {
                  setExpandedCats(new Set(grouped.map(([k]) => k)))
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {allExpanded ? "Contraer todo" : "Expandir todo"}
            </button>
          </div>
          <div className="text-sm">
            {grouped.map(([key, { id, name, items }]) => {
              const isExpanded = expandedCats.has(key)
              const catTotal = items.reduce((s, e) => s + Number(e.amount), 0)
              return (
                <div key={key}>
                  <div className={`flex items-center py-0.5 px-1.5 transition-colors ${isExpanded ? "bg-red-100/50" : "hover:bg-red-100 bg-muted/5"} border-t border-border/50 first:border-t-0`}>
                    <button onClick={() => setExpandedCats((prev) => {
                      const next = new Set(prev)
                      if (next.has(key)) next.delete(key)
                      else next.add(key)
                      return next
                    })} className="p-0.5 rounded hover:bg-accent text-gray-400 hover:text-gray-600 shrink-0">
                      {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                    {id !== "__none__" && (
                      <>
                        <button className="text-blue-500 hover:text-blue-700 shrink-0 ml-0.5" onClick={() => { const cat = budgetCategories.find(c => c.id === id); if (cat) openEditCat(cat) }}>
                          <Pencil className="size-3.5" />
                        </button>
                        <button className="text-red-400 hover:text-red-600 shrink-0 ml-0.5" onClick={() => handleDeleteCat(id, name)}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                    <span className="font-medium truncate min-w-0">{name}</span>
                    <span className="tabular-nums shrink-0 ml-auto font-semibold text-red-600">
                      {fmt(catTotal)}
                    </span>
                  </div>

                  {isExpanded && items.map((exp) => (
                    <div key={exp.id} className="flex items-center py-0.5 pl-8 pr-1.5 hover:bg-red-50/70 border-t border-dashed border-border/30">
                      <span className="truncate min-w-0 text-muted-foreground">{exp.description || exp.budget_categories?.name || "Sin concepto"}</span>
                      <span className="text-[10px] text-muted-foreground mx-1 shrink-0">·</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{exp.people?.name}</span>
                      <span className="text-[10px] text-muted-foreground mx-1 shrink-0">·</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{new Date(exp.date).toLocaleDateString("es-CO")}</span>
                      <span className="tabular-nums shrink-0 text-red-600 ml-auto font-medium">- {fmt(Number(exp.amount))}</span>
                      <button className="text-blue-500 hover:text-blue-700 shrink-0 ml-1" onClick={() => openEdit(exp)}>
                        <Pencil className="size-3" />
                      </button>
                      <button className="text-red-400 hover:text-red-600 shrink-0 ml-0.5" onClick={() => handleDelete(exp.id)}>
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          {grouped.length > 0 && (
            <div className="flex items-center justify-between px-1.5 py-0.5 border-t border-border/50 bg-red-100/30 text-sm">
              <span className="font-semibold">Total general</span>
              <span className="tabular-nums font-semibold text-red-600">{fmt(total)}</span>
            </div>
          )}
          <div className="border-t border-border/50">
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-full px-1.5 py-0.5 hover:bg-muted/30" onClick={openNew}>
              <Plus className="size-3.5" /> {g.newGasto}
            </button>
          </div>
        </div>
      )}

      <Dialog open={!!catToDelete} onOpenChange={(v) => { if (!v) setCatToDelete(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar categoría</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              ¿Eliminar la categoría <strong>{catToDelete?.name}</strong>? Se eliminarán también los siguientes gastos:
            </p>
            {catDeleteExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay gastos asociados.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                {catDeleteExpenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-muted/30">
                    <span className="truncate mr-2">{exp.description || "Sin concepto"}</span>
                    <span className="font-semibold text-red-600 shrink-0">{fmt(Number(exp.amount))}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCatToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDeleteCat}>
                Eliminar {catDeleteExpenses.length > 0 ? `(${catDeleteExpenses.length} gastos)` : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
