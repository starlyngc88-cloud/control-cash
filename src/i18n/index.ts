export type Currency = "COP" | "EUR"

export const CURRENCY_CONFIG: Record<Currency, { locale: string; symbol: string }> = {
  COP: { locale: "es-CO", symbol: "$" },
  EUR: { locale: "es-ES", symbol: "€" },
}

export interface Dictionary {
  app: { name: string; tagline: string; version: string }
  nav: {
    dashboard: string
    presupuestos: string
    ahorros: string
    gastosFuturos: string
    compromisos: string
    ingresos: string
    gastos: string
    personas: string
    guia: string
    personalizacion: string
  }
  dashboard: {
    title: string
    subtitle: string
    ingresos: string
    gastos: string
    balance: string
    ultimosIngresos: string
    ultimosGastos: string
    sinIngresos: string
    sinGastos: string
  }
  gastos: {
    title: string
    subtitle: string
    newGasto: string
    newTitle: string
    editTitle: string
    persona: string
    selectPersona: string
    monto: string
    montoPlaceholder: string
    concepto: string
    conceptoPlaceholder: string
    fecha: string
    rubro: string
    sinRubro: string
    guardar: string
    guardarCambios: string
    total: string
    empty: string
    deleteConfirm: string
  }
  ingresos: {
    title: string
    subtitle: string
    newIngreso: string
    newTitle: string
    editTitle: string
    persona: string
    selectPersona: string
    monto: string
    montoPlaceholder: string
    concepto: string
    conceptoPlaceholder: string
    fecha: string
    guardar: string
    guardarCambios: string
    total: string
    empty: string
    deleteConfirm: string
  }
  personas: {
    title: string
    subtitle: string
    newPersona: string
    newTitle: string
    editTitle: string
    nombre: string
    nombrePlaceholder: string
    crearPersona: string
    guardarCambios: string
    count: string
    empty: string
    deleteConfirm: string
  }
  presupuestos: {
    title: string
    plantillas: string
    nueva: string
    emptyTemplates: string
    mes: string
    rubroPlaceholder: string
    montoPlaceholder: string
    agregarRubro: string
    mesesFinancieros: string
    emptyMonths: string
    verDetalle: string
    newTemplateTitle: string
    editTemplateTitle: string
    nombre: string
    nombrePlaceholder: string
    crearPlantilla: string
    guardarCambios: string
    editCategoryTitle: string
    catNombre: string
    catMonto: string
    catGuardarCambios: string
    newMonthTitle: string
    mesLabel: string
    rubrosLabel: string
    crearMes: string
    deleteTemplateConfirm: string
    deleteMonthConfirm: string
  }
  presupuestoDetail: {
    notFound: string
    ingresos: string
    presupuestado: string
    gastado: string
    balance: string
    empty: string
    rubro: string
    ppto: string
    disponible: string
    exceso: string
    estado: string
    emDash: string
  }
  guia: {
    title: string
    subtitle: string
    step1Title: string
    step1Desc: string
    step2Title: string
    step2Desc: string
    step3Title: string
    step3Desc: string
    step4Title: string
    step4Desc: string
    step5Title: string
    step5Desc: string
    irAPrefix: string
    irAIngresos: string
    irAGastos: string
    consejos: string
    tip1: string
    tip2: string
    tip3: string
    tip4: string
    tip5: string
  }
  personalizacion: {
    title: string
    subtitle: string
    estandar: string
    kellycaribe: string
    standardDesc: string
    caribeDesc: string
    moneda: string
    copDesc: string
    eurDesc: string
    savedMessage: string
  }
  common: {
    loading: string
    save: string
    saveChanges: string
    delete: string
    cancel: string
    confirmDelete: string
    confirmDeletePerson: string
    confirmDeleteGasto: string
    confirmDeleteIngreso: string
  }
  messages: {
    ingresoSaved: string
    gastoSaved: string
    registroActualizado: string
    registroEliminado: string
    sinMovimientos: string
  }
  ahorros: {
    title: string
    subtitle: string
    totalAhorrado: string
    numHuchas: string
    ultimosMovimientos: string
    newHucha: string
    newTitle: string
    editTitle: string
    nombre: string
    nombrePlaceholder: string
    descripcion: string
    descripcionPlaceholder: string
    guardar: string
    guardarCambios: string
    empty: string
    deleteConfirm: string
    addMoney: string
    withdrawMoney: string
    movementTitle: string
    movementType: string
    ingreso: string
    retirada: string
    monto: string
    montoPlaceholder: string
    notas: string
    notasPlaceholder: string
    fecha: string
    successMessage: string
    noMovements: string
  }
  gastosFuturos: {
    title: string
    subtitle: string
    newTitle: string
    editTitle: string
    proximos30: string
    proximos90: string
    totalPrevisto: string
    pendientes: string
    titleLabel: string
    titlePlaceholder: string
    descripcion: string
    descripcionPlaceholder: string
    categoria: string
    categoriaPlaceholder: string
    monto: string
    montoPlaceholder: string
    fecha: string
    guardar: string
    guardarCambios: string
    empty: string
    deleteConfirm: string
    statusPlanned: string
    statusCompleted: string
    statusCancelled: string
    markCompleted: string
    successMessage: string
    noNext30: string
    noNext90: string
  }
  compromisos: {
    title: string
    subtitle: string
    newTitle: string
    editTitle: string
    nombre: string
    nombrePlaceholder: string
    descripcion: string
    descripcionPlaceholder: string
    montoTotal: string
    saldoActual: string
    rubro: string
    sinRubro: string
    guardar: string
    guardarCambios: string
    empty: string
    deleteConfirm: string
    pagar: string
    pagoMonto: string
    pagoCapital: string
    pagoNotas: string
    pagoFecha: string
    totalCompromisos: string
    totalDeuda: string
    pagosRecientes: string
    progreso: string
    sinPagos: string
  }
  errors: {
    generic: string
    form: string
  }
}

export type Language = "standard" | "kellycaribe"

const registry = new Map<Language, Dictionary>()

export function registerLanguage(id: Language, dict: Dictionary) {
  registry.set(id, dict)
}

export function getDictionary(id: Language): Dictionary {
  const dict = registry.get(id)
  if (!dict) throw new Error(`Dictionary not found for language: ${id}`)
  return dict
}

export function getRegisteredLanguages(): Language[] {
  return Array.from(registry.keys())
}
