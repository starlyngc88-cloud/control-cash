import { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { getBudgetTemplates, createBudgetTemplate, deleteBudgetTemplate, getBudgetCategories, createBudgetCategory, updateBudgetCategory, deleteBudgetCategory, getMonthlyBudgets, createMonthlyBudget, deleteMonthlyBudget } from "@/services/api"
import { formatCurrency, formatMonth, getMonthId } from "@/utils/format"
import { Plus, LayoutTemplate, Pencil, Trash2, X, Calendar, ChevronRight, ChevronLeft } from "lucide-react-native"

export default function PresupuestosScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [year, setYear] = useState(new Date().getFullYear())
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [monthlyBudgets, setMonthlyBudgets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [monthModalOpen, setMonthModalOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [catName, setCatName] = useState("")
  const [catBudgeted, setCatBudgeted] = useState("")
  const [catParentId, setCatParentId] = useState<string | null>(null)
  const [editingCat, setEditingCat] = useState<any>(null)

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const load = useCallback(async () => {
    const [tmpl, monthly] = await Promise.all([getBudgetTemplates(), getMonthlyBudgets()])
    setTemplates(tmpl); setMonthlyBudgets(monthly)
    if (tmpl.length > 0 && !selectedTemplate) setSelectedTemplate(tmpl[0].id)
    setLoading(false); setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selectedTemplate) getBudgetCategories(selectedTemplate).then(setCategories)
    else setCategories([])
  }, [selectedTemplate])

  const openNewTemplate = () => { setTemplateName(""); setTemplateModalOpen(true) }

  const createTemplate = async () => {
    if (!templateName.trim()) return
    const { data } = await createBudgetTemplate(templateName.trim())
    if (data) { setSelectedTemplate(data.id); load() }
    setTemplateModalOpen(false)
  }

  const openNewCat = (parentId: string | null = null) => {
    setEditingCat(null); setCatName(""); setCatBudgeted(""); setCatParentId(parentId); setCatModalOpen(true)
  }

  const openEditCat = (cat: any) => {
    setEditingCat(cat); setCatName(cat.name); setCatBudgeted(String(cat.budgeted)); setCatParentId(cat.parent_id); setCatModalOpen(true)
  }

  const handleCatSubmit = async () => {
    if (!catName.trim() || !selectedTemplate) { Alert.alert("Error", "Completá nombre."); return }
    setSubmitting(true)
    try {
      const data = { template_id: selectedTemplate, name: catName.trim(), budgeted: parseFloat(catBudgeted) || 0, parent_id: catParentId }
      if (editingCat) await updateBudgetCategory(editingCat.id, { name: catName.trim(), budgeted: parseFloat(catBudgeted) || 0, parent_id: catParentId })
      else await createBudgetCategory(data)
      setCatModalOpen(false); getBudgetCategories(selectedTemplate).then(setCategories)
    } catch { Alert.alert("Error", "No se pudo guardar.") }
    finally { setSubmitting(false) }
  }

  const handleDeleteCat = (id: string) => {
    Alert.alert("Eliminar categoría", "¿Estás segura?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => { await deleteBudgetCategory(id); getBudgetCategories(selectedTemplate!).then(setCategories) }},
    ])
  }

  const handleDeleteTemplate = (id: string) => {
    Alert.alert("Eliminar plantilla", "¿Estás segura? Se borrarán todas sus categorías.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => { await deleteBudgetTemplate(id); setSelectedTemplate(null); load() }},
    ])
  }

  const openMonth = () => setMonthModalOpen(true)

  const shiftMonth = (delta: number) => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))

  const selectedMonthStr = getMonthId(monthCursor)
  const selectedMonthLabel = formatMonth(selectedMonthStr + "-01")
  const selectedTemplateName = templates.find((t: any) => t.id === selectedTemplate)?.name ?? ""
  const monthAlreadyOpen = monthlyBudgets.some((mb: any) => String(mb.month ?? "").slice(0, 7) === selectedMonthStr)

  const createMonth = async () => {
    if (!selectedTemplate) { Alert.alert("Error", "Creá una plantilla primero."); return }
    if (monthAlreadyOpen) { Alert.alert("Mes ya abierto", "Ese mes ya tiene presupuesto. Tocá el mes en la lista para abrirlo."); return }
    setSubmitting(true)
    const { error } = await createMonthlyBudget({ template_id: selectedTemplate, month: selectedMonthStr + "-01" })
    setSubmitting(false)
    if (error) Alert.alert("Error", error.message)
    else { setMonthModalOpen(false); load() }
  }

  const parentCats = categories.filter((c: any) => !c.parent_id)
  const childCats = (parentId: string) => categories.filter((c: any) => c.parent_id === parentId)

  const parentIds = new Set(categories.filter((c: any) => c.parent_id).map((c: any) => c.parent_id))
  const totalBudgeted = categories.filter((c: any) => !parentIds.has(c.id)).reduce((s: number, c: any) => s + Number(c.budgeted), 0)

  const yearMonths = monthlyBudgets.filter((mb: any) => {
    const mbMonth = String(mb.month ?? "").slice(0, 7)
    return parseInt(mbMonth.slice(0, 4), 10) === year
  })

  const monthShort = (m: string) => {
    const [y, mm] = m.split("-")
    const d = new Date(Number(y), Number(mm) - 1, 1)
    return d.toLocaleDateString("es-CO", { month: "short" })
  }

  if (loading) return (
    <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  )

  return (
    <View className="flex-1 bg-[#f8fafc]" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text className="text-lg font-bold text-slate-800">Presupuestos</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={openMonth} className="bg-white border border-slate-200 px-3 py-2 rounded-xl"><Calendar size={14} color="#4f46e5" /></TouchableOpacity>
          <TouchableOpacity onPress={openNewTemplate} className="bg-indigo-600 px-3 py-2 rounded-xl"><Plus size={14} color="white" /></TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#4f46e5" />}>
        {/* Meses abiertos */}
        {monthlyBudgets.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[10px] font-medium text-slate-400">Meses abiertos · {year}</Text>
              <View className="flex-row items-center gap-0.5">
                <TouchableOpacity onPress={() => setYear((y) => y - 1)} className="p-1"><ChevronLeft size={12} color="#94a3b8" /></TouchableOpacity>
                <Text className="text-[10px] font-semibold text-slate-600 tabular-nums">{year}</Text>
                <TouchableOpacity onPress={() => setYear((y) => y + 1)} className="p-1"><ChevronRight size={12} color="#94a3b8" /></TouchableOpacity>
              </View>
            </View>
            {yearMonths.length === 0 ? (
              <Text className="text-[10px] text-slate-400">No hay meses abiertos en {year}.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5">
                {yearMonths.map((mb: any) => (
                  <TouchableOpacity key={mb.id} onPress={() => router.push({ pathname: "/presupuesto-detalle", params: { id: mb.id } })} className="bg-white px-3 py-2 rounded-lg border border-slate-200 min-w-[92px]">
                    <Text className="text-[10px] font-semibold text-slate-700 capitalize">{monthShort(mb.month)}</Text>
                    <Text className="text-[10px] text-slate-400 tabular-nums">{formatCurrency(Number(mb.totalBudgeted ?? 0))}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Plantilla base */}
        {templates.length > 0 && (
          <View className="mb-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[10px] font-medium text-slate-400">Plantilla base</Text>
              <Text className="text-[9px] text-slate-400">Se copia al abrir un mes · cada mes es independiente</Text>
            </View>
            <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {templates.map((t: any) => (
                  <TouchableOpacity key={t.id} onPress={() => setSelectedTemplate(t.id)}
                    className={`px-3 py-1.5 rounded-xl border ${selectedTemplate === t.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                    <Text className={`text-xs font-medium ${selectedTemplate === t.id ? "text-white" : "text-slate-600"}`}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {selectedTemplate && templates.find((t: any) => t.id === selectedTemplate) && (
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs text-slate-500">Presupuestado base: {formatCurrency(totalBudgeted)}</Text>
                <TouchableOpacity onPress={() => handleDeleteTemplate(selectedTemplate)}><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {!selectedTemplate || !templates.find((t: any) => t.id === selectedTemplate) ? (
          <View className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm items-center">
            <LayoutTemplate size={32} color="#cbd5e1" />
            <Text className="text-xs text-slate-400 mt-2">Seleccioná o creá una plantilla</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {parentCats.map((parent: any) => {
              const children = childCats(parent.id)
              const hasChildren = children.length > 0
              return (
                <View key={parent.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <View className="flex-row items-center justify-between px-4 py-3">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-800">{parent.name}</Text>
                      <Text className="text-[10px] text-slate-400">
                        {hasChildren ? `${children.length} subcategorías` : formatCurrency(Number(parent.budgeted))}
                      </Text>
                    </View>
                    <View className="flex-row gap-1">
                      <TouchableOpacity onPress={() => openNewCat(parent.id)} className="p-1"><Plus size={12} color="#4f46e5" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => openEditCat(parent)} className="p-1"><Pencil size={12} color="#94a3b8" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCat(parent.id)} className="p-1"><Trash2 size={12} color="#e11d48" /></TouchableOpacity>
                    </View>
                  </View>
                  {hasChildren && (
                    <View className="bg-slate-50 px-4 py-2 space-y-1.5">
                      {children.map((child: any) => (
                        <View key={child.id} className="flex-row items-center justify-between">
                          <Text className="text-xs text-slate-600">{child.name}</Text>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-xs font-medium text-slate-800">{formatCurrency(Number(child.budgeted))}</Text>
                            <TouchableOpacity onPress={() => openEditCat(child)} className="p-0.5"><Pencil size={10} color="#94a3b8" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteCat(child.id)} className="p-0.5"><Trash2 size={10} color="#e11d48" /></TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
            <TouchableOpacity onPress={() => openNewCat(null)} className="flex-row items-center justify-center gap-1.5 py-3">
              <Plus size={12} color="#4f46e5" /><Text className="text-xs font-medium text-indigo-600">Agregar categoría a la plantilla base</Text>
            </TouchableOpacity>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      {/* Template Modal */}
      <Modal visible={templateModalOpen} animationType="fade" transparent>
        <View className="flex-1 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <Text className="text-sm font-semibold text-slate-800 mb-3">Nueva plantilla</Text>
            <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 mb-3" placeholder="Nombre de la plantilla" placeholderTextColor="#94a3b8" value={templateName} onChangeText={setTemplateName} />
            <TouchableOpacity onPress={createTemplate} className="h-10 rounded-xl bg-indigo-600 items-center justify-center"><Text className="text-sm font-semibold text-white">Crear</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal visible={catModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-5 border-t border-slate-200 shadow-xl" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-semibold text-slate-800">{editingCat ? "Editar categoría" : "Nueva categoría"}</Text>
              <TouchableOpacity onPress={() => setCatModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View className="space-y-3">
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Nombre</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="Ej: Vivienda" placeholderTextColor="#94a3b8" value={catName} onChangeText={setCatName} />
              </View>
              <View>
                <Text className="text-xs font-medium text-slate-600 mb-1">Monto presupuestado</Text>
                <TextInput className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" placeholder="0" placeholderTextColor="#94a3b8" value={catBudgeted} onChangeText={setCatBudgeted} keyboardType="decimal-pad" />
              </View>
              {catParentId && (
                <Text className="text-[10px] text-indigo-500">Subcategoría de: {parentCats.find((c: any) => c.id === catParentId)?.name}</Text>
              )}
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
            <Text className="text-sm font-semibold text-slate-800 mb-1">Abrir mes</Text>
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

            <TouchableOpacity onPress={createMonth} disabled={submitting || monthAlreadyOpen || !selectedTemplate} className="h-10 rounded-xl bg-indigo-600 items-center justify-center">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-sm font-semibold text-white">Abrir mes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
