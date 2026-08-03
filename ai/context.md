# KellyCash - Full Context

App de finanzas familiares multi-persona (web + mobile) que reemplaza las hojas de Excel para el control de ingresos/gastos del hogar.

- **Web:** Next.js 16.2.11 (App Router), React 19.2.4, TypeScript 5, Supabase (SSR), Tailwind CSS 4, Shadcn UI, Zod 4.
- **Mobile:** Expo SDK 54, React Native 0.81.5, React 19.1.0, expo-router 6, NativeWind 4, Supabase JS. (carpeta `mobile/`)
- **Branding:** logo de moneda con fondo transparente (`assets/logo-transparent.png`) aplicado en web y mobile. Favicon web 256px (`src/app/icon.png`).

## Pages (web)
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
- `/login` Auth — split-screen: panel izquierdo oscuro (sidebar style) con logo Image + formulario en card blanco

## Screens (mobile, expo-router en `mobile/app/`)
- `(auth)/login` — login/registro, `behavior="height"` en Android, `returnKeyType` + `onSubmitEditing` (Enter navega), `softwareKeyboardLayoutMode: "resize"` en app.json
- `(auth)/forgot-password` — recuperar contraseña
- `(tabs)/index` — Dashboard (filtro de meses, resumen)
- `(tabs)/ingresos` — CRUD ingresos
- `(tabs)/gastos` — CRUD gastos
- `(tabs)/presupuestos` — plantillas + meses
- `presupuesto-detalle` — detalle del mes vs presupuesto
- `(tabs)/hucha` — ahorros
- `(tabs)/gastos-futuros` — gastos planificados
- `(tabs)/compromisos` — deudas + pagos
- `(tabs)/personas` — CRUD personas
- `(tabs)/ajustes` + `(tabs)/more` — configuración / más opciones
- `personalizacion` — idioma, moneda, seguridad, usuarios

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

## Mobile conventions (`mobile/`)
- API functions en `mobile/services/api.ts`
- Cliente Supabase en `mobile/lib/supabase.ts` (+ expo-secure-store para la sesión)
- Componentes UI en `mobile/components/ui/` (Button, Card, Input, Badge, EmptyState)
- Iconos con `lucide-react-native`, estilos con NativeWind (Tailwind)
- expo-font `~14.0.12` (fijado tras crash `getDirectConverter` en APK)

## DB Tables (all with user_id + RLS)
people, income, income_categories, expenses (expense_category_id, budget_category_id), expense_categories, budget_templates, budget_categories, monthly_budgets, savings, saving_categories, saving_movements, future_expenses, future_expense_categories, commitments, commitment_payments, allowed_users, user_roles