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
- Categorías vinculadas al modelo base (budget_categories)
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

- Filtro de fechas compartido con Ingresos, Gastos y Presupuestos
- 3 tarjetas superiores: Ingresos/Gastos (barras), Balance, Presupuesto
- Últimos movimientos: listado unificado ingresos + gastos ordenado por fecha

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

## Personalización (Configuración)

- Cambio de moneda (COP/EUR)
- Cambio de dialecto (standard/kellycaribe)
- Cambio de contraseña
- Gestión de usuarios permitidos (admin)