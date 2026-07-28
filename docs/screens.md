# Screens / Pantallas - KellyCash

## Dashboard (`/`)
- Header con ícono + título + subtítulo + filtro de fechas
- 3 cards superiores: Ingresos/Gastos (barras comparativas), Balance, Presupuesto (barra de progreso)
- Últimos movimientos: listado unificado ingresos (verde) + gastos (rojo), ordenado por fecha

## Ingresos (`/ingresos`)
- Header con ícono + título + filtro de fechas + botones Categorías + Nuevo ingreso
- Total acumulado del período
- Lista de ingresos con persona, categoría, fecha, monto
- Botones editar/eliminar por item

## Gastos (`/gastos`)
- Header con ícono + título + filtro de fechas + botones Categoría + Nuevo gasto
- Cards de estadísticas (total, más alto, sin categoría, top categoría)
- Lista de gastos agrupada por categoría (expandible)
- Botones editar/eliminar por item

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
- Cambio de moneda (COP/EUR)
- Cambio de idioma/dialecto
- Cambio de contraseña
- Gestión de usuarios permitidos (admin)

## Guía (`/guia`)
- Pasos interactivos de uso de la app
- 7 pasos con iconos y descripciones

## Login (`/login`)
- Formulario de inicio de sesión
- Redirección post-auth