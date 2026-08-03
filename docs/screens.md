# Screens / Pantallas - KellyCash (Refactorizado)

## Dashboard (`/`)
- Header con título + DateFilter (píldora con diálogo MultiMonthPicker) + acciones
- StatBadge row (grid-cols-3):
  - Ingresos/Gastos unificados en un solo card (verde/rojo separados por divisor)
  - Balance (verde si ≥ 0, rojo si < 0)
  - Presupuesto (violeta, con icono link a /presupuestos/[id] si 1 mes seleccionado)
- Layout 2 columnas (lg:grid-cols-3):
  - Card "Evolución anual" (col-span-2): barras verticales agrupadas (ingresos verde, gastos rojo, presupuesto violeta, balance azul), filtrado por months, leyenda inferior
  - Card "Últimos movimientos" (col-span-1): lista unificada ingresos + gastos ordenada por fecha, máximo 8 items
- Budget progress bar horizontal al fondo: verde < 80%, amarillo 80-100%, rojo > 100%

## Ingresos (`/ingresos`)
- Header con título + DateFilter + dropdown "Nuevo" (Nueva categoría / Nuevo ingreso)
- **KPI Cards** (4): Total ingresado, Ingreso récord, Categorías, Sin categoría
- Búsqueda con icono Search
- **Lista agrupada por categoría** (expandible): header con nombre, count, total + acciones editar/eliminar categoría
- Cada ítem: icono, descripción, fecha, persona, monto, botones editar/eliminar
- **Diálogo nuevo/editar ingreso**: persona, monto, concepto, categoría (con `+` inline), fecha
- **Diálogo categoría**: crear/editar nombre, con selección posterior automática si se crea desde el `+`
- **Diálogo eliminar categoría**: siempre pide confirmación, lista ingresos asociados si existen
- Submit button deshabilitado durante operación

## Gastos (`/gastos`)
- Header con título + DateFilter + dropdown "Nuevo" (Nueva categoría / Nuevo gasto)
- **KPI Cards** (4): Total gastado, Gasto récord, Categorías, Sin categoría
- Búsqueda con icono Search
- **Selector doble en el formulario**:
  - **Rubro**: budget categories (agrupadas por plantilla)
  - **Categoría de gastos**: expense categories (rubros generales) con `+` inline
- **Lista agrupada por categoría** (expandible): header con nombre, count, total + acciones editar/eliminar
- **Diálogo eliminar categoría**: siempre pide confirmación (antes saltaba si no había gastos)
- **Diálogo confirmación eliminar categoría con gastos asociados**: lista los gastos que se eliminarán

## Presupuestos (`/presupuestos`)
- Header con nombre plantilla + DateFilter
- Dos columnas:
  - Izquierda: categorías jerárquicas (expandibles) con montos y total
  - Derecha: lista de meses financieros con total presupuestado y acceso al detalle
- Diálogos: editar categoría, nueva categoría, nuevo mes, eliminar con confirmación

## Presupuesto detalle (`/presupuestos/[id]`)
- Dashboard del mes: ingresos, gastos, balance, progreso por categoría
- Tabla de categorías con: presupuestado, gastado, disponible, exceso, %

## Ahorros (`/ahorros`)
- KPI Cards (total ahorrado, meta más cercana)
- Lista agrupada por categoría (expandible) con editar/eliminar
- Diálogo confirmación eliminar categoría con ahorros asociados

## Gastos Futuros (`/gastos-futuros`)
- KPI Cards (total previsto, próximos 30/90 días, pendientes)
- Lista agrupada por categoría (expandible) con indicadores de urgencia (dots rojo/amarillo/verde)
- Diálogo confirmación eliminar categoría con gastos asociados

## Compromisos (`/compromisos`)
- Lista agrupada por categoría (expandible) con editar/eliminar
- Diálogo confirmación eliminar categoría con compromisos asociados

## Personas (`/personas`)
- CRUD simple de personas con Card + lista
- Diálogo crear/editar persona

## Personalización (`/personalizacion`)
- Grid 2-columnas (md:grid-cols-2) con 4 cards:
  - **Idioma**: radios standard/kellycaribe con descripciones
  - **Moneda**: radios COP/EUR con samples formateados
  - **Seguridad**: formulario cambio de contraseña (actual, nueva, confirmar) con validaciones y disabled submit
  - **Usuarios Autorizados** (solo admin): input email + botón Agregar, lista con indicador activo/inactivo, select rol, toggle activo, botón eliminar (con diálogo confirmación)
- Submit buttons deshabilitados durante operación
- friendlyError() en errores

## Guía (`/guia`)
- Pasos interactivos de uso de la app
- 7 pasos con iconos y descripciones

## Login (`/login`) — Refactorizado
- **Split-screen layout:**
  - Panel izquierdo (oculto en mobile `hidden lg:flex`): `bg-[#0f172a]` (color sidebar), **logo moneda** (`/logo.png` vía `<Image>`), título "KellyCash", slogan "La platica bajo control"
  - Panel derecho: formulario centrado en card `bg-white rounded-xl border-slate-100 shadow-sm p-8`
- Logo mobile: Image + "KellyCash" visible solo en pantallas pequeñas
- Inputs con iconos decorativos (Mail, Lock) con pl-10
- Focus states: indigo-500 ring
- Botón submit: indigo-600 con shadow-indigo-200
- Modos: login / register, toggle con link
- Errores específicos de Supabase (Email not confirmed, rate limit, etc.)
- `friendlyError()` pasa strings directamente
- Redirección post-auth a `/`

## Sidebar (global, colapsable)
- Se oculta en `/login`
- Header con logo moneda (Image `/logo.png`) + nombre app + botón colapsar
- Colapsable a versión reducida (iconos sin texto)
- Nav principal con iconos coloreados: Dashboard, Presupuestos, Ingresos, Gastos, Ahorros, Gastos Futuros, Compromisos
- Sección expandible "Configuración" → Personalización, Personas
- Sección inferior: Guía, Cerrar sesión, avatar de usuario (iniciales + email)

## Header (global)
- Se oculta en `/login`
- Título dinámico según ruta
- DateFilter centrado
- Acciones inyectadas por HeaderActionsContext (dropdown "Nuevo" con opciones)

## DateFilter (componente compartido)
- Píldora: icono Calendar + label + ChevronDown
- Diálogo con MultiMonthPicker
- MultiMonthPicker:
  - Input manual YYYY-MM + botón +
  - Grid 4 columnas de meses (multi-select toggle)
  - Flechas año anterior/siguiente
  - Tags de meses seleccionados
  - Botón "Aplicar (N meses)"
- Persistido en localStorage como dashboard-months
- Usado en Dashboard, Presupuestos, Ingresos, Gastos

---

# Pantallas Mobile (Expo / expo-router)

Estructura en `mobile/app/`. Grupo `(tabs)` = tab bar inferior; grupo `(auth)` = login/registro.

## Login (`(auth)/login`)
- Login / registro / toggle
- Android: `behavior="height"` en KeyboardAvoidingView (teclado no tapa el form)
- `returnKeyType` + `onSubmitEditing`: Enter/Next navega entre campos y dispara submit
- `softwareKeyboardLayoutMode: "resize"` en app.json
- Recuperar contraseña: `(auth)/forgot-password`

## Tab bar (`(tabs)/_layout.tsx`)
- Ítems: Dashboard, Ingresos, Gastos, Presupuestos, Hucha, Gastos Futuros, Compromisos, Personas, Ajustes, Más (organizados según necesidad)

## Dashboard (`(tabs)/index`)
- Resumen con filtro de meses + últimos movimientos

## Ingresos (`(tabs)/ingresos`)
- CRUD de ingresos con categorías

## Gastos (`(tabs)/gastos`)
- CRUD de gastos con rubro (budget) + categoría de gastos

## Presupuestos (`(tabs)/presupuestos`)
- Plantillas + meses financieros

## Detalle de presupuesto (`presupuesto-detalle`)
- Dashboard del mes vs presupuesto

## Hucha (`(tabs)/hucha`)
- Ahorros con movimientos (abono/retiro)

## Gastos Futuros (`(tabs)/gastos-futuros`)
- Gastos planificados con estados

## Compromisos (`(tabs)/compromisos`)
- Deudas con pagos parciales

## Personas (`(tabs)/personas`)
- CRUD de personas

## Ajustes / Más (`(tabs)/ajustes`, `(tabs)/more`)
- Configuración general / opciones adicionales

## Personalización (`personalizacion`)
- Idioma, moneda, seguridad, usuarios

## Componentes mobile (`mobile/components/`)
- `DateFilter.tsx`, `DatePickerModal.tsx`, `LineChart.tsx`
- `ui/`: Badge, Button, Card, EmptyState, Input
- Estilos con NativeWind (Tailwind); iconos con lucide-react-native