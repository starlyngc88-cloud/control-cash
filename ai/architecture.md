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
AuthProvider > LanguageProvider > MonthFilterProvider > HeaderActionsProvider > Sidebar + Header + children
```

## Estado global compartido

- **MonthFilterContext:** Array de meses seleccionados (`string[]` en formato `YYYY-MM`), persistido en localStorage como `dashboard-months`. Se usa en Dashboard, Presupuestos, Ingresos y Gastos.
- **LanguageProvider:** Idioma actual (standard/kellycaribe), moneda (COP/EUR).
- **HeaderActionsContext:** Permite a cada página inyectar acciones en el Header (ej: botón "Nuevo" con dropdown).

## Dashboard

- Filtro de meses (DateFilter en píldora con MultiMonthPicker)
- StatBadge row: Ingresos/Gastos unificados, Balance, Presupuesto
- 2-column layout: Evolución anual (gráfico vertical barras, 2/3) + Últimos movimientos (1/3)
- Barra de progreso del presupuesto horizontal al fondo
- `getYearlyData()` en db.ts para datos anuales

## Sidebar

- Colapsable (ancho 64 → 16)
- Se oculta en `/login` (`if (pathname === "/login") return null`)
- Altura fija: `h-screen overflow-hidden`
- Header compacto con logo Wallet + nombre
- Nav principal con iconos coloreados: Dashboard, Presupuestos, Ingresos, Gastos, Ahorros, Compromisos, Gastos Futuros
- Sección expandible: Configuración → Personalización, Personas
- Sección inferior: Guía, Cerrar sesión, avatar de usuario

## Header

- Altura fija `h-20`, bg-white, border-b, shadow-sm
- Se oculta en `/login`
- Título de página dinámico según ruta
- DateFilter centrado
- Acciones inyectadas por HeaderActionsContext (ej: botón "Nuevo" con dropdown)

## Patrón común en CRUD views (Ingresos, Gastos, GastosFuturos, Ahorros, Compromisos)

1. **KPI Cards** — grid 4 columnas con totales, récords, conteos
2. **Búsqueda** — input con icono Search, filtrado por descripción/categoría/persona
3. **Vista agrupada por categoría** — expandible, con header de categoría (editar/eliminar), items listados
4. **Diálogos** — crear/editar item, crear/editar categoría, confirmación de eliminar (siempre con Dialog, no `confirm()`)
5. **Creación inline de categorías** — botón `+` junto al select de categoría en el formulario, optimist push al estado