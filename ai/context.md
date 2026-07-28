# KellyCash - Full Context

App de finanzas familiares multi-persona. Next.js 14, TypeScript, Supabase, Tailwind, Shadcn UI.

## Pages
- `/` Dashboard (filtro fechas, barras ing/gastos, balance, presupuesto, últimos movimientos)
- `/ingresos` CRUD con categorías
- `/gastos` CRUD con categorías presupuestarias
- `/presupuestos` Plantilla + categorías jerárquicas + meses financieros
- `/presupuestos/[id]` Dashboard mensual vs presupuesto
- `/ahorros` Cuentas + movimientos
- `/gastos-futuros` Gastos planificados
- `/compromisos` Deudas + pagos
- `/personas` CRUD personas
- `/personalizacion` Moneda, idioma, password, usuarios
- `/guia` Pasos interactivos
- `/login` Auth

## Global state
- AuthProvider (user, signOut)
- LanguageProvider (t, fmt)
- MonthFilterContext (months[], setMonths) - compartido en Dashboard, Presupuestos, Ingresos, Gastos

## Key conventions
- "use client" when hooks needed
- DB functions in src/lib/db.ts
- Types in src/types/index.ts
- Translations in i18n/ (standard.ts, kellycaribe.ts)
- Components UI from @/components/ui/
- No comments in code
- Sidebar: sidebar.tsx with emojiMap + nav translations

## DB Tables
people, income, income_categories, expenses, budget_templates, budget_categories, monthly_budgets, savings, saving_categories, saving_movements, future_expenses, future_expense_categories, commitments, commitment_payments, allowed_users, user_roles