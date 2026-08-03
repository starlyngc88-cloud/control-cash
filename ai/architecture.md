# KellyCash - Documentación Completa

## Stack

- **Framework (web):** Next.js 16.2.11 (App Router)
- **Framework (mobile):** Expo SDK 54 (React Native 0.81.5, expo-router 6, NativeWind 4) — carpeta `mobile/`
- **Lenguaje:** TypeScript
- **Base de datos:** Supabase (PostgreSQL) + RLS (Row Level Security)
- **Validación:** Zod (schemas en src/lib/validation.ts)
- **Sanitización:** XSS protection en src/lib/sanitize.ts
- **Estilos:** Tailwind CSS + Shadcn UI (componentes)
- **Autenticación:** Supabase Auth
- **Hosting:** Vercel (web) + EAS Build (mobile, APK/AAB)

## Estructura del proyecto

```
├── src/                    # Web (Next.js App Router)
│   ├── app/                # App Router pages
│   │   ├── page.tsx        # Dashboard
│   │   ├── layout.tsx      # Root layout
│   │   ├── icon.png        # Favicon (256px, moneda transparente)
│   │   ├── ingresos/       # Ingresos page
│   │   ├── gastos/         # Gastos page
│   │   ├── presupuestos/   # Presupuestos + plantillas
│   │   │   └── [id]/       # Detalle de presupuesto mensual
│   │   ├── ahorros/        # Ahorros page
│   │   ├── compromisos/    # Compromisos page
│   │   ├── gastos-futuros/ # Gastos futuros page
│   │   ├── personas/       # Personas page
│   │   ├── personalizacion/# Idioma, Moneda, Seguridad, Usuarios
│   │   ├── guia/           # Guía de uso
│   │   └── login/          # Login page
│   ├── components/
│   │   ├── auth/           # AuthProvider
│   │   ├── layout/
│   │   │   └── sidebar.tsx # Sidebar navigation (logo moneda Image)
│   │   ├── ui/             # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── month-picker.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── table.tsx
│   │   │   └── textarea.tsx
│   │   ├── DateFilter.tsx          # Filtro de fecha compartido (píldora + diálogo)
│   │   └── MonthFilterContext.tsx  # Contexto global de filtro con persistencia localStorage
│   ├── i18n/
│   │   ├── index.ts        # Tipos Dictionary
│   │   ├── standard.ts     # Traducción estándar
│   │   ├── kellycaribe.ts  # Traducción caribeña
│   │   └── useLanguage.tsx # LanguageProvider + hook
│   ├── lib/
│   │   ├── db.ts           # Todas las funciones de base de datos (usa Zod + sanitize internamente)
│   │   ├── validation.ts   # Zod schemas para validación de entidades
│   │   ├── sanitize.ts     # XSS sanitization utility
│   │   ├── errors.ts       # friendlyError() y logError() para errores amigables
│   │   ├── supabase.ts     # Cliente Supabase
│   │   ├── supabase-server.ts # Cliente SSR
│   │   └── utils.ts        # Utilidades (cn)
│   ├── types/
│   │   └── index.ts        # Interfaces TypeScript
│   ├── sql/
│   │   ├── rls-migration.sql  # Agrega user_id a todas las tablas
│   │   └── rls-policies.sql   # Políticas RLS por usuario
│   └── proxy.ts             # Auth middleware (matcher excluye imágenes/assets)
├── mobile/                 # Mobile (Expo SDK 54)
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── (auth)/login.tsx          # Login (behavior="height", Enter navega)
│   │   ├── (auth)/forgot-password.tsx
│   │   ├── (tabs)/_layout.tsx
│   │   ├── (tabs)/index.tsx          # Dashboard
│   │   ├── (tabs)/ingresos.tsx
│   │   ├── (tabs)/gastos.tsx
│   │   ├── (tabs)/presupuestos.tsx
│   │   ├── (tabs)/hucha.tsx
│   │   ├── (tabs)/gastos-futuros.tsx
│   │   ├── (tabs)/compromisos.tsx
│   │   ├── (tabs)/personas.tsx
│   │   ├── (tabs)/ajustes.tsx
│   │   ├── (tabs)/more.tsx
│   │   ├── presupuesto-detalle.tsx
│   │   └── personalizacion.tsx
│   ├── components/
│   │   ├── DateFilter.tsx
│   │   ├── DatePickerModal.tsx
│   │   ├── LineChart.tsx
│   │   └── ui/            # Badge, Button, Card, EmptyState, Input, index
│   ├── lib/
│   │   └── supabase.ts    # Cliente Supabase + expo-secure-store
│   ├── services/
│   │   └── api.ts         # Funciones de API
│   ├── assets/            # icon.png, adaptive-icon.png, splash.png (moneda transparente)
│   ├── app.json           # softwareKeyboardLayoutMode: "resize", newArchEnabled
│   └── eas.json           # profiles: development, preview (APK), production (AAB)
├── public/
│   └── logo.png           # Logo moneda transparente (web)
├── assets/                # logo-transparent.png, app-icon.png, adaptive-icon.png (fuente)
└── sql/                   # schema.sql + migraciones (migraciones 2026)
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
- Header compacto con logo moneda (`/logo.png` con Image) + nombre
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

## Mobile (Expo SDK 54)

- Navegación con expo-router: grupo `(tabs)` para las pantallas principales + grupo `(auth)` para login/registro.
- Tab bar: Dashboard, Ingresos, Gastos, Presupuestos, Hucha, Gastos Futuros, Compromisos, Personas, Ajustes, Más (organizado en `(tabs)/_layout.tsx`).
- Login: `behavior="height"` en Android (evita que el teclado tape el form), `returnKeyType` + `onSubmitEditing` para navegar con Enter/Next, y `softwareKeyboardLayoutMode: "resize"` en `app.json`.
- Datos: las funciones de API viven en `mobile/services/api.ts` y llaman a la misma base Supabase; la sesión se guarda con expo-secure-store.
- Estilos con NativeWind (Tailwind). Iconos con lucide-react-native.
- Build con EAS: `eas build --profile preview` genera APK; `--profile production` genera AAB. `eas.json` usa `cli.appVersionSource: "local"` y `newArchEnabled: true` en app.json.
- **Nota crítica:** `expo-font` está fijado en `~14.0.12`. Si Expo lo duplica en `expo/node_modules`, el APK crashea al abrir con `NoSuchMethodError: getDirectConverter` en `FontLoaderModule.kt:98`.