# KellyCash - Documentación Completa

## Stack

- **Framework:** Next.js 14+ (App Router)
- **Lenguaje:** TypeScript
- **Base de datos:** Supabase (PostgreSQL) + RLS (Row Level Security)
- **Validación:** Zod (14 schemas en src/lib/validation.ts)
- **Sanitización:** XSS protection en src/lib/sanitize.ts
- **Estilos:** Tailwind CSS + Shadcn UI (componentes)
- **Autenticación:** Supabase Auth
- **Hosting:** Vercel

## Estructura del proyecto

```
src/
├── app/                    # App Router pages
│   ├── page.tsx           # Dashboard
│   ├── layout.tsx         # Root layout
│   ├── ingresos/          # Ingresos page
│   ├── gastos/            # Gastos page
│   ├── presupuestos/      # Presupuestos + plantillas
│   │   └── [id]/          # Detalle de presupuesto mensual
│   ├── ahorros/           # Ahorros page
│   ├── compromisos/       # Compromisos page
│   ├── gastos-futuros/    # Gastos futuros page
│   ├── personas/          # Personas page
│   ├── personalizacion/   # Grid con cards: Idioma, Moneda, Seguridad, Usuarios
│   ├── guia/              # Guía de uso
│   └── login/             # Login page
├── components/
│   ├── auth/              # AuthProvider
│   ├── layout/
│   │   └── sidebar.tsx    # Sidebar navigation
│   ├── ui/                # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── month-picker.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── table.tsx
│   │   └── textarea.tsx
│   ├── DateFilter.tsx          # Filtro de fecha compartido (píldora + diálogo)
│   └── MonthFilterContext.tsx  # Contexto global de filtro con persistencia localStorage
├── i18n/
│   ├── index.ts           # Tipos Dictionary
│   ├── standard.ts        # Traducción estándar
│   ├── kellycaribe.ts     # Traducción caribeña
│   └── useLanguage.tsx    # LanguageProvider + hook
├── lib/
│   ├── db.ts              # Todas las funciones de base de datos (usa Zod + sanitize internamente)
│   ├── validation.ts      # 14 Zod schemas para validación de entidades
│   ├── sanitize.ts        # XSS sanitization utility
│   ├── errors.ts          # friendlyError() y logError() para errores amigables
│   ├── supabase.ts        # Cliente Supabase
│   ├── supabase-server.ts # Cliente SSR
│   └── utils.ts           # Utilidades (cn)
├── types/
│   └── index.ts           # Interfaces TypeScript
├── sql/
│   ├── rls-migration.sql  # Agrega user_id a todas las tablas
│   └── rls-policies.sql   # Políticas RLS por usuario para 14 tablas
└── middleware.ts           # Auth middleware
```

## Providers (orden en layout.tsx)

```
AuthProvider > LanguageProvider > MonthFilterProvider > Sidebar + children
```

## Estado global compartido

- **MonthFilterContext:** Array de meses seleccionados (`string[]` en formato `YYYY-MM`), persistido en localStorage como `dashboard-months`. Se usa en Dashboard, Presupuestos, Ingresos y Gastos.
- **LanguageProvider:** Idioma actual (standard/kellycaribe), moneda (COP/EUR).

## Dashboard

- Filtro de meses (DateFilter en píldora con MultiMonthPicker)
- StatBadge row: Ingresos/Gastos unificados, Balance, Presupuesto
- 2-column layout: Evolución anual (gráfico vertical barras, 2/3) + Últimos movimientos (1/3)
- Barra de progreso del presupuesto horizontal al fondo
- `getYearlyData()` en db.ts para datos anuales

## Sidebar

- Colapsable (ancho 56 → 10)
- Altura fija: `h-screen overflow-hidden` (sin scroll)
- Header compacto con logo + nombre
- Nav principal: Dashboard, Presupuestos, Ingresos, Gastos, Hucha, Compromisos, Gastos Futuros
- Sección expandible: Configuración (⚙️) → Personalización, Personas
- Sección inferior: Guía, Cerrar sesión