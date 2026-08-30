import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { getBudgetTemplates, createBudgetTemplate, getBudgetCategories, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory, getMonthlyBudgets, createMonthlyBudget, deleteMonthlyBudget, type MonthlyBudgetWithTotals } from "@/services/api"
import { formatCurrency, formatMonth, getMonthId } from "@/utils/format"
import { Plus, Pencil, Trash2, X, Calendar, ChevronRight, ChevronLeft, ChevronDown, LayoutTemplate } from "lucide-react-native"
import type { BudgetTemplate, BudgetCategory } from "@/types/database"

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function PresupuestosScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const isTablet = width >= 768
  const [templates, setTemplates] = useState<BudgetTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudgetWithTotals[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [monthModalOpen, setMonthModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const [templateOpen, setTemplateOpen] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())

  const [catName, setCatName] = useState("")
  const [catBudgeted, setCatBudgeted] = useState("")
  const [catParentId, setCatParentId] = useState<string | null>(null)
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null)
  const [catHasSub, setCatHasSub] = useState(false)

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const load = useCallback(async () => {
    try {
      let tmpl = await getBudgetTemplates()
      if (tmpl.length === 0) {
        const { data } = await createBudgetTemplate("Modelo Base")
        if (data) tmpl = await getBudgetTemplates()
      }
      const monthly = await getMonthlyBudgets()
      setTemplates(tmpl)
      setMonthlyBudgets(monthly)
      setSelectedTemplate((cur) => {
        if (cur && tmpl.some((t) => t.id === cur)) return cur
        const base = tmpl.find((t) => t.name.toLowerCase() === "modelo base")
        return base?.id ?? tmpl[0]?.id ?? null
      })
    } catch {
      Alert.alert("Error", "No se pudo cargar la plantilla base.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void (async () => { await load() })() }, [load])

  useEffect(() => {
    void (async () => {
      if (selectedTemplate) {
        const cats = await getBudgetCategories(selectedTemplate)
        setCategories(cats)
        const withChildren = cats.filter((c: BudgetCategory) => !c.parent_id && cats.some((cc) => cc.parent_id === c.id))
        setExpandedParents(new Set(withChildren.map((c) => c.id)))
      } else {
        setCategories([])
      }
    })()
  }, [selectedTemplate])

  const openNewCat = (parentId: string | null = null) => {
    setEditingCat(null); setCatName(""); setCatBudgeted(""); setCatParentId(parentId); setCatHasSub(false); setCatModalOpen(true)
  }

  const openEditCat = (cat: BudgetCategory) => {
    const hasChildren = categories.some((c) => c.parent_id === cat.id)
    setEditingCat(cat); setCatName(cat.name); setCatBudgeted(hasChildren ? "" : String(cat.budgeted)); setCatParentId(cat.parent_id); setCatHasSub(hasChildren || Number(cat.budgeted) === 0); setCatModalOpen(true)
  }

  const handleCatSubmit = async () => {
    if (!catName.trim() || !selectedTemplate) { Alert.alert("Error", "Completá nombre."); return }
    setSubmitting(true)
    try {
      const budgeted = catHasSub ? 0 : (parseFloat(catBudgeted) || 0)
      if (editingCat) await updateBudgetCategory(editingCat.id, { name: catName.trim(), budgeted, parent_id: catParentId })
      else await createBudgetCategory({ template_id: selectedTemplate, name: catName.trim(), budgeted, parent_id: catParentId })
      setCatModalOpen(false); void getBudgetCategories(selectedTemplate).then(setCategories)
    } catch { Alert.alert("Error", "No se pudo guardar.") }
    finally { setSubmitting(false) }
  }

  const handleDeleteCat = (id: string, name: string) => {
    Alert.alert("Eliminar rubro", `¿Eliminar "${name}" de la plantilla base?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        try { await deleteBudgetCategory(id); void getBudgetCategories(selectedTemplate!).then(setCategories) }
        catch { Alert.alert("Error", "No se pudo eliminar.") }
      } },
    ])
  }

  const openMonth = () => setMonthModalOpen(true)

  const shiftMonth = (delta: number) => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))

  const selectedMonthStr = getMonthId(monthCursor)
  const selectedMonthLabel = formatMonth(selectedMonthStr + "-01")
  const selectedTemplateName = templates.find((t: BudgetTemplate) => t.id === selectedTemplate)?.name ?? ""
  const monthAlreadyOpen = monthlyBudgets.some((mb: MonthlyBudgetWithTotals) => String(mb.month ?? "").slice(0, 7) === selectedMonthStr)

  const createMonth = async () => {
    if (!selectedTemplate) { Alert.alert("Error", "Creá la plantilla base primero."); return }
    if (monthAlreadyOpen) { Alert.alert("Mes ya abierto", "Ese mes ya tiene presupuesto. Tocá el mes en la lista para abrirlo."); return }
    setSubmitting(true)
    const { error } = await createMonthlyBudget({ template_id: selectedTemplate, month: selectedMonthStr + "-01" })
    setSubmitting(false)
    if (error) Alert.alert("Error", error.message)
    else { setMonthModalOpen(false); load() }
  }

  const handleDeleteMonth = (mb: MonthlyBudgetWithTotals) => {
    Alert.alert("Eliminar mes", `¿Eliminar el presupuesto de ${formatMonth(mb.month)}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        try { await deleteMonthlyBudget(mb.id); load() }
        catch { Alert.alert("Error", "No se pudo eliminar.") }
      } },
    ])
  }

  const toggleParent = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const parentCats = categories.filter((c: BudgetCategory) => !c.parent_id)
  const childCats = (parentId: string) => categories.filter((c: BudgetCategory) => c.parent_id === parentId)

  const parentIds = new Set(categories.filter((c: BudgetCategory) => c.parent_id).map((c: BudgetCategory) => c.parent_id))
  const totalBudgeted = categories.filter((c: BudgetCategory) => !parentIds.has(c.id)).reduce((s: number, c: BudgetCategory) => s + Number(c.budgeted), 0)

  const parentsWithChildren = parentCats.filter((p) => childCats(p.id).length > 0)
  const allExpanded = parentsWithChildren.length > 0 && parentsWithChildren.every((p) => expandedParents.has(p.id))

  const monthsByYear = monthlyBudgets.reduce<Record<number, MonthlyBudgetWithTotals[]>>((acc: Record<number, MonthlyBudgetWithTotals[]>, mb: MonthlyBudgetWithTotals) => {
    const yr = parseInt(String(mb.month ?? "").slice(0, 4), 10)
    ;(acc[yr] ??= []).push(mb)
    return acc
  }, {})
  const yearMonths = (monthsByYear[year] ?? []).filter((mb: MonthlyBudgetWithTotals) => mb.hasMovements)

  const currentMonthStr = getMonthId(new Date())

  if (loading) return (
    <View className="flex-1 bg-[#f8fafc] items-center justify-center" style={{ paddingTop: insets.top }}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  )

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text className="text-lg font-bold text-slate-800">Presupuestos</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={openMonth} className="bg-white border border-slate-200 px-3 py-2 rounded-xl"><Calendar size={14} color="#4f46e5" /></TouchableOpacity>
          <TouchableOpacity onPress={() => openNewCat(null)} className="bg-indigo-600 px-3 py-2 rounded-xl"><Plus size={14} color="white" /></TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}>
        {isTablet ? (
          <View className="flex-row gap-4">
            {/* Columna izquierda: Plantilla base */}
            <View className="flex-[2]">
              {templates.length > 0 && selectedTemplate ? (
                <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <TouchableOpacity onPress={() => setTemplateOpen((o) => !o)} className="flex-row items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <View className="flex-1">
                      <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Plantilla base</Text>
                      <Text className="text-[9px] text-slate-400 mt-0.5">Se copia al abrir un mes.</Text>
                    </View>
                    {templateOpen ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                  </TouchableOpacity>

                  {templateOpen && parentsWithChildren.length > 0 && (
                    <TouchableOpacity onPress={() => { if (allExpanded) setExpandedParents(new Set()); else setExpandedParents(new Set(parentsWithChildren.map((p) => p.id))) }} className="px-4 py-2 bg-white">
                      <Text className="text-[10px] text-slate-400 underline">{allExpanded ? "Contraer todo" : "Expandir todo"}</Text>
                    </TouchableOpacity>
                  )}

                  {templateOpen && parentCats.map((parent: BudgetCategory) => {
                    const children = childCats(parent.id)
                    const hasChildren = children.length > 0
                    const isExpanded = expandedParents.has(parent.id)
                    const parentTotal = hasChildren ? children.reduce((s: number, c: BudgetCategory) => s + Number(c.budgeted), 0) : Number(parent.budgeted)
                    return (
                      <View key={parent.id}>
                        <TouchableOpacity
                          onPress={() => hasChildren && toggleParent(parent.id)}
                          activeOpacity={hasChildren ? 0.7 : 1}
                          className="flex-row items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200"
                        >
                          {hasChildren ? (
                            <View className="mr-1">{isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}</View>
                          ) : (
                            <View className="size-3.5 mr-1" />
                          )}
                          <Text className="flex-1 text-xs font-semibold text-slate-700 uppercase tracking-wider">{parent.name}</Text>
                          <Text className="text-xs font-semibold text-slate-700 tabular-nums">{capitalize(formatCurrency(parentTotal))}</Text>
                        </TouchableOpacity>

                        {hasChildren && isExpanded && (
                          <View className="bg-white">
                            {children.map((child: BudgetCategory) => (
                              <View key={child.id} className="flex-row items-center px-4 py-2 border-b border-slate-100">
                                <View className="flex-1 flex-row items-center">
                                  <View className="size-7 rounded-full items-center justify-center bg-slate-100 mr-2.5">
                                    <Plus size={12} color="#64748b" />
                                  </View>
                                  <Text className="text-xs font-medium text-slate-900">{child.name}</Text>
                                </View>
                                <Text className="text-xs font-semibold text-slate-900 tabular-nums mr-2">{capitalize(formatCurrency(Number(child.budgeted)))}</Text>
                                <View className="flex-row items-center gap-0.5">
                                  <TouchableOpacity onPress={() => openEditCat(child)} className="p-1"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleDeleteCat(child.id, child.name)} className="p-1"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {!hasChildren && (
                          <View className="flex-row items-center px-4 py-2 border-b border-slate-100">
                            <View className="flex-1" />
                            <Text className="text-xs text-slate-400 mr-2">{formatCurrency(Number(parent.budgeted))}</Text>
                            <TouchableOpacity onPress={() => openNewCat(parent.id)} className="p-1"><Plus size={12} color="#4f46e5" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => openEditCat(parent)} className="p-1"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteCat(parent.id, parent.name)} className="p-1"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )
                  })}

                  {templateOpen && <View className="flex-row items-center justify-between px-4 py-3 border-t border-slate-200">
                    <Text className="text-sm font-semibold text-slate-700">Total</Text>
                    <Text className="text-sm font-semibold text-slate-700 tabular-nums">{capitalize(formatCurrency(totalBudgeted))}</Text>
                  </View>}

                  {templateOpen && <TouchableOpacity onPress={() => openNewCat(null)} className="flex-row items-center justify-center gap-1.5 py-3 border-t border-slate-200">
                    <Plus size={14} color="#4f46e5" /><Text className="text-xs font-medium text-indigo-600">Agregar rubro</Text>
                  </TouchableOpacity>}
                </View>
              ) : (
                <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
                  <LayoutTemplate size={32} color="#cbd5e1" />
                  <Text className="text-xs text-slate-400 mt-2">Creando la plantilla base…</Text>
                </View>
              )}
            </View>
            {/* Columna derecha: Meses financieros */}
            <View className="flex-[1]">
              <View className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <View className="flex-row items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Meses</Text>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity onPress={openMonth} className="flex-row items-center gap-1 bg-indigo-50 rounded-lg px-2.5 py-1.5">
                      <Calendar size={12} color="#4f46e5" /><Text className="text-[10px] font-semibold text-indigo-600">Abrir</Text>
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-0.5 bg-white border border-slate-200 rounded-lg px-1.5 py-1">
                      <TouchableOpacity onPress={() => setYear((y) => y - 1)} hitSlop={6} className="p-0.5"><ChevronLeft size={14} color="#94a3b8" /></TouchableOpacity>
                      <Text className="text-xs font-semibold text-slate-700 tabular-nums min-w-[36px] text-center">{year}</Text>
                      <TouchableOpacity onPress={() => setYear((y) => y + 1)} hitSlop={6} className="p-0.5"><ChevronRight size={14} color="#94a3b8" /></TouchableOpacity>
                    </View>
                  </View>
                </View>

                {yearMonths.length === 0 ? (
                  <Text className="text-xs text-slate-500 px-4 py-6">Sin meses en {year}.</Text>
                ) : (
                  yearMonths.map((mb: MonthlyBudgetWithTotals) => {
                    const isCurrent = String(mb.month ?? "").slice(0, 7) === currentMonthStr
                    return (
                      <TouchableOpacity
                        key={mb.id}
                        onPress={() => router.push({ pathname: "/presupuesto-detalle", params: { id: mb.id } })}
                        className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100"
                      >
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-xs font-semibold text-slate-900 capitalize">{formatMonth(mb.month)}</Text>
                            {isCurrent && (
                              <View className="bg-indigo-100 rounded-full px-1.5 py-0.5">
                                <Text className="text-[8px] font-semibold text-indigo-600 uppercase">Actual</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-[10px] text-slate-500 tabular-nums mt-1">{formatCurrency(Number(mb.totalBudgeted ?? 0))} ppto.</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <ChevronRight size={11} color="#64748b" />
                          <TouchableOpacity onPress={() => handleDeleteMonth(mb)} hitSlop={8} className="p-1">
                            <Trash2 size={13} color="#e11d48" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    )
                  })
                )}
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Meses financieros carrusel */}
            <View className="mb-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <View className="flex-row items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Meses financieros</Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity onPress={openMonth} className="flex-row items-center gap-1 bg-indigo-50 rounded-lg px-2.5 py-1.5">
                    <Calendar size={12} color="#4f46e5" /><Text className="text-[10px] font-semibold text-indigo-600">Abrir mes</Text>
                  </TouchableOpacity>
                  <View className="flex-row items-center gap-0.5 bg-white border border-slate-200 rounded-lg px-1.5 py-1">
                    <TouchableOpacity onPress={() => setYear((y) => y - 1)} hitSlop={6} className="p-0.5"><ChevronLeft size={14} color="#94a3b8" /></TouchableOpacity>
                    <Text className="text-xs font-semibold text-slate-700 tabular-nums min-w-[36px] text-center">{year}</Text>
                    <TouchableOpacity onPress={() => setYear((y) => y + 1)} hitSlop={6} className="p-0.5"><ChevronRight size={14} color="#94a3b8" /></TouchableOpacity>
                  </View>
                </View>
              </View>

              {yearMonths.length === 0 ? (
                <Text className="text-xs text-slate-500 px-6 py-6">No hay meses con movimientos en {year}.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-3 py-3 gap-2">
                  {yearMonths.map((mb: MonthlyBudgetWithTotals) => {
                    const isCurrent = String(mb.month ?? "").slice(0, 7) === currentMonthStr
                    return (
                      <TouchableOpacity
                        key={mb.id}
                        onPress={() => router.push({ pathname: "/presupuesto-detalle", params: { id: mb.id } })}
                        className="w-40 rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs font-semibold text-slate-900 capitalize">{formatMonth(mb.month)}</Text>
                          {isCurrent && (
                            <View className="bg-indigo-100 rounded-full px-1.5 py-0.5">
                              <Text className="text-[8px] font-semibold text-indigo-600 uppercase">Actual</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[10px] text-slate-500 tabular-nums mt-1.5">{formatCurrency(Number(mb.totalBudgeted ?? 0))} ppto.</Text>
                        <View className="flex-row items-center justify-between mt-2">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-[10px] font-medium text-indigo-600">Ver detalle</Text>
                            <ChevronRight size={11} color="#64748b" />
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteMonth(mb)} hitSlop={8} className="p-1">
                            <Trash2 size={13} color="#e11d48" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              )}
            </View>

            {/* Plantilla base */}
            {templates.length > 0 && selectedTemplate ? (
              <View className="mb-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <TouchableOpacity onPress={() => setTemplateOpen((o) => !o)} className="flex-row items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Plantilla base</Text>
                    <Text className="text-[9px] text-slate-400 mt-0.5">Se copia al abrir un mes. Cada mes se edita de forma independiente.</Text>
                  </View>
                  {templateOpen ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                </TouchableOpacity>

                {templateOpen && parentsWithChildren.length > 0 && (
                  <TouchableOpacity onPress={() => { if (allExpanded) setExpandedParents(new Set()); else setExpandedParents(new Set(parentsWithChildren.map((p) => p.id))) }} className="px-4 py-2 bg-white">
                    <Text className="text-[10px] text-slate-400 underline">{allExpanded ? "Contraer todo" : "Expandir todo"}</Text>
                  </TouchableOpacity>
                )}

                {templateOpen && parentCats.map((parent: BudgetCategory) => {
                  const children = childCats(parent.id)
                  const hasChildren = children.length > 0
                  const isExpanded = expandedParents.has(parent.id)
                  const parentTotal = hasChildren ? children.reduce((s: number, c: BudgetCategory) => s + Number(c.budgeted), 0) : Number(parent.budgeted)
                  return (
                    <View key={parent.id}>
                      <TouchableOpacity
                        onPress={() => hasChildren && toggleParent(parent.id)}
                        activeOpacity={hasChildren ? 0.7 : 1}
                        className="flex-row items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200"
                      >
                        {hasChildren ? (
                          <View className="mr-1">{isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}</View>
                        ) : (
                          <View className="size-3.5 mr-1" />
                        )}
                        <Text className="flex-1 text-xs font-semibold text-slate-700 uppercase tracking-wider">{parent.name}</Text>
                        <Text className="text-xs font-semibold text-slate-700 tabular-nums">{capitalize(formatCurrency(parentTotal))}</Text>
                      </TouchableOpacity>

                      {hasChildren && isExpanded && (
                        <View className="bg-white">
                          {children.map((child: BudgetCategory) => (
                            <View key={child.id} className="flex-row items-center px-4 py-2 border-b border-slate-100">
                              <View className="flex-1 flex-row items-center">
                                <View className="size-7 rounded-full items-center justify-center bg-slate-100 mr-2.5">
                                  <Plus size={12} color="#64748b" />
                                </View>
                                <Text className="text-xs font-medium text-slate-900">{child.name}</Text>
                              </View>
                              <Text className="text-xs font-semibold text-slate-900 tabular-nums mr-2">{capitalize(formatCurrency(Number(child.budgeted)))}</Text>
                              <View className="flex-row items-center gap-0.5">
                                <TouchableOpacity onPress={() => openEditCat(child)} className="p-1"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteCat(child.id, child.name)} className="p-1"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {!hasChildren && (
                        <>
                          <View className="flex-row items-center px-4 py-2 border-b border-slate-100">
                            <View className="flex-1" />
                            <Text className="text-xs text-slate-400 mr-2">{formatCurrency(Number(parent.budgeted))}</Text>
                            <TouchableOpacity onPress={() => openNewCat(parent.id)} className="p-1"><Plus size={12} color="#4f46e5" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => openEditCat(parent)} className="p-1"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteCat(parent.id, parent.name)} className="p-1"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  )
                })}

                {templateOpen && <View className="flex-row items-center justify-between px-4 py-3 border-t border-slate-200">
                  <Text className="text-sm font-semibold text-slate-700">Total</Text>
                  <Text className="text-sm font-semibold text-slate-700 tabular-nums">{capitalize(formatCurrency(totalBudgeted))}</Text>
                </View>}

                {templateOpen && <TouchableOpacity onPress={() => openNewCat(null)} className="flex-row items-center justify-center gap-1.5 py-3 border-t border-slate-200">
                  <Plus size={14} color="#4f46e5" /><Text className="text-xs font-medium text-indigo-600">Agregar rubro</Text>
                </TouchableOpacity>}
              </View>
            ) : (
              <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center mb-4">
                <LayoutTemplate size={32} color="#cbd5e1" />
                <Text className="text-xs text-slate-400 mt-2">Creando la plantilla base…</Text>
              </View>
            )}
          </>
        )}

        <View className="h-8" />
      </ScrollView>

      {/* Category Modal */}
      <Modal visible={catModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editingCat ? "Editar rubro" : catParentId ? "Nueva subcategoría" : "Nuevo rubro"}</Text>
              <TouchableOpacity onPress={() => setCatModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View className="space-y-3">
              {catParentId && (
                <Text className="text-[10px] text-indigo-500">Dentro de: {parentCats.find((c: BudgetCategory) => c.id === catParentId)?.name}</Text>
              )}
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Nombre</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Ej: Vivienda" placeholderTextColor="#94a3b8" value={catName} onChangeText={setCatName} />
              </View>
              {!catHasSub && (
                <View>
                  <Text className="text-xs font-medium text-slate-600 mb-1">Monto presupuestado</Text>
                  <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={catBudgeted} onChangeText={setCatBudgeted} keyboardType="decimal-pad" />
                </View>
              )}
              {catHasSub && !editingCat && (
                <View className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                  <Text className="text-[10px] text-amber-700">El valor se calculará automáticamente como la suma de sus subcategorías.</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => { setCatHasSub(!catHasSub); if (!catHasSub) setCatBudgeted("") }}
                className="flex-row items-center gap-2"
              >
                <View className={`size-4 rounded border ${catHasSub ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"}`}>
                  {catHasSub && <Text className="text-white text-[10px] text-center">✓</Text>}
                </View>
                <Text className="text-xs text-slate-600">Tiene subcategorías</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleCatSubmit} disabled={submitting} className="h-11 rounded-xl bg-indigo-600 items-center justify-center mt-4">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">{editingCat ? "Guardar cambios" : "Crear"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Month Modal */}
      <Modal visible={monthModalOpen} animationType="fade" transparent>
        <View className="flex-1 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-sm font-semibold text-slate-800">Abrir mes</Text>
              <TouchableOpacity onPress={() => setMonthModalOpen(false)} hitSlop={8} className="p-1">
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text className="text-[10px] text-slate-400 mb-4">Se copiará la plantilla: {selectedTemplateName || "—"}</Text>

            <View className="flex-row items-center justify-center gap-4 mb-4">
              <TouchableOpacity onPress={() => shiftMonth(-1)} className="p-2 border border-slate-200 rounded-xl"><ChevronLeft size={16} color="#4f46e5" /></TouchableOpacity>
              <View className="flex-1 items-center">
                <Text className="text-base font-bold text-slate-800 capitalize">{selectedMonthLabel}</Text>
              </View>
              <TouchableOpacity onPress={() => shiftMonth(1)} className="p-2 border border-slate-200 rounded-xl"><ChevronRight size={16} color="#4f46e5" /></TouchableOpacity>
            </View>

            {monthAlreadyOpen && (
              <View className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 mb-4">
                <Text className="text-[10px] text-amber-700">Ese mes ya tiene presupuesto. Tocá el mes en la lista para verlo.</Text>
              </View>
            )}

            <TouchableOpacity onPress={createMonth} disabled={submitting || monthAlreadyOpen} className="h-10 rounded-xl bg-indigo-600 items-center justify-center">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">Abrir mes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}