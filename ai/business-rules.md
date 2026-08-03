# Reglas de negocio - KellyCash

## Personas

- CRUD completo
- Se usan para asociar ingresos y gastos a una persona
- Mínimo 1 persona para operar

## Ingresos

- Asociados a una persona (obligatorio)
- Monto, descripción, fecha, categoría (opcional)
- Categorías: CRUD propio (income_categories)
- Filtrables por rango de meses (fecha)
- Totales: suma del período seleccionado

## Gastos

- Asociados a una persona (obligatorio)
- Monto, descripción, fecha, categoría presupuestaria (opcional)
- **Doble clasificación:** cada gasto puede tener un **rubro** (`budget_category_id`, categoría de la plantilla de presupuesto) y una **categoría de gastos** (`expense_category_id`, rubros generales de la tabla `expense_categories`). Ambos opcionales, independientes.
- Categorías de gastos: CRUD propio (expense_categories), con creación inline desde el formulario
- Filtrables por rango de meses (fecha)
- El gasto puede tener o no categoría

## Presupuestos (Budget)

- **Plantilla (BudgetTemplate):** "Modelo Base" creada automáticamente
- **Categorías (BudgetCategory):** Árbol jerárquico con padres y subcategorías
  - Si tiene subcategorías, el monto se calcula como suma de hijas
  - Si no tiene, se asigna un monto fijo
- **Meses financieros (MonthlyBudget):** Copia la plantilla para un mes específico
  - Cada mes tiene su propio dashboard con:
    - Total presupuestado
    - Total gastado (vs presupuesto)
    - Total ingresos del mes
    - Progreso por categoría (verde < 80%, amarillo 80-100%, rojo > 100%)

## Dashboard

- Filtro de meses compartido (MonthFilterContext) con Ingresos, Gastos y Presupuestos
- Fila compacta de StatBadge: Ingresos/Gastos unificados (barra verde/rojo), Balance, Presupuesto (con link a presupuesto del mes si hay 1 mes seleccionado)
- Layout 2 columnas: Evolución anual (gráfico vertical barras, 2/3) + Últimos movimientos (1/3)
- Barra de progreso del presupuesto como banda horizontal al fondo
- getYearlyData(año): devuelve array mensual con ingresos, gastos, presupuesto, balance
- Evolución anual filtrada por meses seleccionados (máx 12 meses)

## Ahorros

- CRUD de cuentas de ahorro
- Movimientos: ingreso (abono) o retiro
- Seguimiento de monto actual

## Gastos Futuros

- Gastos planificados con fecha estimada
- Estados: planned, completed, cancelled
- Categorías propias

## Compromisos

- Deudas/compromisos financieros con monto total
- Pagos parciales (capital + monto)
- Seguimiento de saldo actual

## Seguridad

- Validación Zod en todas las operaciones create/update (16 schemas en validation.ts)
- Sanitización XSS en todos los inputs (sanitize.ts)
- Errores amigables: friendlyError() nunca expone detalles técnicos al usuario
- RLS (Row Level Security): todas las tablas tienen user_id + política FOR ALL USING (user_id = auth.uid())
- Security headers en next.config.ts
- Submit buttons deshabilitados durante operaciones asíncronas

## Personalización (Configuración)

- Grid 2-columnas con 4 cards: Idioma, Moneda, Seguridad, Usuarios
- Idioma: radio buttons standard/kellycaribe con descripciones
- Moneda: radio buttons COP/EUR con samples formateados
- Seguridad: formulario cambio de contraseña (actual, nueva, confirmar) con validaciones
- Usuarios (solo admin): lista con email + controls (rol, activo/inactivo, eliminar)
  - Primera fila: email + select rol + toggle activo + botón eliminar
  - Segunda fila: role/status como texto
- Submit buttons con `disabled={busy}` + Loader2
- friendlyError() para mensajes de error amigables