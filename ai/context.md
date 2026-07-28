# KellyCash - Full Context

App de finanzas familiares multi-persona. Next.js 14, TypeScript, Supabase, Tailwind, Shadcn UI.

## Pages
- `/` Dashboard (filtro meses, StatBadge row, gráfico anual vertical 2/3 + movimientos 1/3, barra presupuesto inferior)
- `/ingresos` CRUD con categorías (filtro meses)
- `/gastos` CRUD con categorías presupuestarias (filtro meses)
- `/presupuestos` Plantilla + categorías jerárquicas + meses financieros
- `/presupuestos/[id]` Dashboard mensual vs presupuesto
- `/ahorros` Cuentas + movimientos
- `/gastos-futuros` Gastos planificados
- `/compromisos` Deudas + pagos
- `/personas` CRUD personas
- `/personalizacion` Grid 2-columnas con cards: Idioma, Moneda, Seguridad, Usuarios
- `/guia` Pasos interactivos
- `/login` Auth

## Global state
- AuthProvider (user, signOut, isAdmin, refreshRole)
- LanguageProvider (t, fmt, language, setLanguage, currency, setCurrency)
- MonthFilterContext (months[], setMonths) - persistido en localStorage como `dashboard-months`, compartido en Dashboard, Presupuestos, Ingresos, Gastos

## Key conventions
- "use client" when hooks needed
- DB functions in src/lib/db.ts
- Zod schemas in src/lib/validation.ts (14 schemas para todas las entidades)
- XSS sanitization in src/lib/sanitize.ts
- Friendly errors in src/lib/errors.ts (friendlyError, logError)
- Types in src/types/index.ts
- Translations in i18n/ (standard.ts, kellycaribe.ts)
- Components UI from @/components/ui/
- No comments in code
- Sidebar: sidebar.tsx with emojiMap + nav translations + "Configuración" expandible con Personalización y Personas
- Submit buttons disabled during submission with `disabled={busy}` + Loader2
- Seguridad: RLS policies (sql/rls-policies.sql, sql/rls-migration.sql), security headers en next.config.ts

## DB Tables (all with user_id + RLS)
people, income, income_categories, expenses, budget_templates, budget_categories, monthly_budgets, savings, saving_categories, saving_movements, future_expenses, future_expense_categories, commitments, commitment_payments, allowed_users, user_roles