# Screens / Pantallas - KellyCash

## Dashboard (`/`)
- Header con ícono + título + subtítulo + DateFilter (píldora con diálogo MultiMonthPicker)
- StatBadge row (grid-cols-3):
  - Ingresos/Gastos unificados en un solo card (verde/rojo separados por divisor)
  - Balance (verde si ≥ 0, rojo si < 0)
  - Presupuesto (violeta, con icono link a /presupuestos/[id] si 1 mes seleccionado)
- Layout 2 columnas (lg:grid-cols-3):
  - Card "Evolución anual" (col-span-2): barras verticales agrupadas (ingresos verde, gastos rojo, presupuesto violeta, balance azul), filtrado por months, leyenda inferior
  - Card "Últimos movimientos" (col-span-1): lista unificada ingresos + gastos ordenada por fecha, máximo 8 items
- Budget progress bar horizontal al fondo: verde < 80%, amarillo 80-100%, rojo > 100%

## Ingresos (`/ingresos`)
- Header con ícono + título + filtro de fechas + botones Categorías + Nuevo ingreso
- Total acumulado del período
- Lista de ingresos con persona, categoría, fecha, monto
- Botones editar/eliminar por item
- Submit button deshabilitado durante operación (disabled={busy} + Loader2)

## Gastos (`/gastos`)
- Header con ícono + título + filtro de fechas + botones Categoría + Nuevo gasto
- Cards de estadísticas (total, más alto, sin categoría, top categoría)
- Lista de gastos agrupada por categoría (expandible)
- Botones editar/eliminar por item
- Submit button deshabilitado durante operación

## Presupuestos (`/presupuestos`)
- Header con ícono + nombre plantilla + filtro de fechas
- Dos columnas:
  - Izquierda: categorías jerárquicas (expandibles) con montos y total
  - Derecha: lista de meses financieros con total presupuestado y acceso al detalle
- Diálogos: editar categoría, nueva categoría, nuevo mes, eliminar

## Presupuesto detalle (`/presupuestos/[id]`)
- Dashboard del mes: ingresos, gastos, balance, progreso por categoría
- Tabla de categorías con: presupuestado, gastado, disponible, exceso, %

## Ahorros (`/ahorros`)
- Cards de resumen (total ahorrado, meta más cercana)
- Lista de cuentas de ahorro con saldo y barra de progreso
- Movimientos por cuenta

## Gastos Futuros (`/gastos-futuros`)
- Cards de resumen (total previsto, próximos 30/90 días, pendientes)
- Lista de gastos futuros con estado, fecha, monto

## Compromisos (`/compromisos`)
- Lista de compromisos con saldo y progreso
- Pagos registrados por compromiso

## Personas (`/personas`)
- CRUD simple de personas
- Lista con nombre

## Personalización (`/personalizacion`)
- Grid 2-columnas (md:grid-cols-2) con 4 cards:
  - **Idioma**: radios standard/kellycaribe con descripciones
  - **Moneda**: radios COP/EUR con samples formateados
  - **Seguridad**: formulario cambio de contraseña (actual, nueva, confirmar) con validaciones y disabled submit
  - **Usuarios Autorizados** (solo admin):
    - Input email + botón Agregar
    - Lista de usuarios con:
      - Primera fila: indicador activo/inactivo + email + select rol + toggle activo + botón eliminar
      - Segunda fila: texto "Administrador/Usuario · Activo/Inactivo"
- Submit buttons deshabilitados durante operación
- friendlyError() en errores

## Guía (`/guia`)
- Pasos interactivos de uso de la app
- 7 pasos con iconos y descripciones

## Login (`/login`)
- Formulario de inicio de sesión
- Redirección post-auth

## Sidebar (global, colapsable)
- Header con logo + nombre app
- Nav principal: Dashboard, Presupuestos, Ingresos, Gastos, Ahorros, Gastos Futuros, Compromisos
- Sección expandible "Configuración" → Personalización, Personas
- Sección inferior: Guía, Cerrar sesión

## DateFilter (componente compartido)
- Píldora: icono Calendar violeta + label + ChevronDown
- Diálogo con MultiMonthPicker
- MultiMonthPicker:
  - Input manual YYYY-MM + botón +
  - Grid 4 columnas de meses (multi-select toggle)
  - Flechas año anterior/siguiente
  - Tags de meses seleccionados
  - Botón "Aplicar (N meses)"
- Persistido en localStorage como dashboard-months
- Usado en Dashboard, Presupuestos, Ingresos, Gastos