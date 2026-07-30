# KellyCash - Full Context

App de finanzas familiares multi-persona. Next.js 14, TypeScript, Supabase, Tailwind, Shadcn UI.

## Pages
- `/` Dashboard (filtro meses, StatBadge row, gráfico anual vertical 2/3 + movimientos 1/3, barra presupuesto inferior)
- `/ingresos` CRUD con categorías (filtro meses) — KPI cards, vista agrupada por categoría con expandir/contraer, diálogo de confirmación para eliminar
- `/gastos` CRUD con categorías presupuestarias (filtro meses) — KPI cards, vista agrupada por categoría, selector doble: rubro (budget) + categoría de gastos, confirmación siempre al eliminar categoría
- `/presupuestos` Plantilla + categorías jerárquicas + meses financieros
- `/presupuestos/[id]` Dashboard mensual vs presupuesto
- `/ahorros` Cuentas + movimientos — vista agrupada por categoría
- `/gastos-futuros` Gastos planificados — vista agrupada por categoría con indicadores de urgencia
- `/compromisos` Deudas + pagos — vista agrupada por categoría
- `/personas` CRUD personas
- `/personalizacion` Grid 2-columnas con cards: Idioma, Moneda, Seguridad, Usuarios
- `/guia` Pasos interactivos
- `/login` Auth — split-screen: panel izquierdo oscuro (sidebar style) + formulario en card blanco

## Global state
- AuthProvider (user, signOut, isAdmin, refreshRole)
- LanguageProvider (t, fmt, language, setLanguage, currency, setCurrency)
- MonthFilterContext (months[], setMonths) - persistido en localStorage como `dashboard-months`, compartido en Dashboard, Presupuestos, Ingresos, Gastos

## Key conventions
- "use client" when hooks needed
- DB functions in src/lib/db.ts
- Zod schemas in src/lib/validation.ts (14 schemas para todas las entidades)
- XSS sanitization in src/lib/sanitize.ts
- Friendly errors in src/lib/errors.ts (friendlyError pasa strings sin modificarlos)
- Types in src/types/index.ts (Expense tiene expense_category_id y budget_category_id)
- Translations in i18n/ (standard.ts, kellycaribe.ts)
- Components UI from @/components/ui/
- No comments in code
- Sidebar: sidebar.tsx — oculta en `/login`, colapsable, nav con iconos + "Configuración" expandible
- Submit buttons disabled during submission with `disabled={busy}` + Loader2
- Seguridad: RLS policies (sql/rls-policies.sql, sql/rls-migration.sql), security headers en next.config.ts
- Eliminación con diálogo de confirmación personalizado (no `confirm()` nativo) en todas las vistas
- Las vistas de Ingresos/Gastos/GastosFuturos/Ahorros/Compromisos comparten patrón: KPI cards + búsqueda + lista agrupada por categoría expandible

## DB Tables (all with user_id + RLS)
people, income, income_categories, expenses (expense_category_id, budget_category_id), budget_templates, budget_categories, monthly_budgets, savings, saving_categories, saving_movements, future_expenses, future_expense_categories, commitments, commitment_payments, allowed_users, user_roles