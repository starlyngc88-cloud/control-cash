# KellyCash Branding

- **Nombre app:** KellyCash
- **Slogan:** La platica bajo control
- **Tagline:** La platica bajo control
- **Versión:** KellyCash v1.0

## Logo

- **Logo oficial:** moneda con fondo transparente — recortada de `img/logokc.png` (1407x768), centro (702,385), radio 358 → `assets/logo-transparent.png` (736x736).
- Derivados:
  - `assets/app-icon.png` (1024x1024, moneda 920) — app icon de referencia
  - `assets/adaptive-icon.png` (1024x1024, moneda 720) — con margen para máscara Android
  - `public/logo.png` — logo web (login panel oscuro + sidebar, vía `<Image>`)
  - `src/app/icon.png` — favicon web 256px (~122 KB; antes 1024px/1.7MB causaba icono corrupto)
  - `mobile/assets/icon.png`, `mobile/assets/adaptive-icon.png`, `mobile/assets/splash.png` — app mobile
- Splash/adaptive en mobile: `backgroundColor #ffffff`.

## Tono de voz

- Relajado, familiar, caribeño (dialecto opcional)
- "So Va" = Guardar
- "Lo que entró" = Ingresos
- "Lo que salió" = Gastos
- "Lo guardao" = Ahorros

## Idiomas

- **standard.ts:** Español neutro
- **kellycaribe.ts:** Español caribeño/coloquial (ej: "Mete Billete", "La Plata que Sale", "El Bonche")

## Monedas

- COP ($) - locale es-CO
- EUR (€) - locale es-ES
- Configurable desde Personalización

## Emojis del menú

| Sección | Emoji |
|---------|-------|
| Dashboard | 📊 |
| Presupuestos | 📋 |
| Ahorros | 🐷 |
| Gastos Futuros | 🎯 |
| Compromisos | 🔒 |
| Ingresos | 💰 |
| Gastos | 💸 |
| Personas | 👥 |
| Configuración (expandible) | ⚙️ |
| Personalización | ⚙️ |
| Guía | 📖 |

## Esquema de colores (Tailwind) — Diseño Refactorizado

- **Primario:** indigo-600 / indigo-700 hover — botones, acentos (`#4f46e5`)
- **Sidebar:** `bg-[#0f172a]` (slate-900) — panel izquierdo oscuro
- **Superficie:** white — cards, diálogos
- **Fondo página:** `bg-[#f8fafc]` (slate-50)
- **Cards:** `rounded-xl border border-slate-100 shadow-sm`
- **Inputs:** bg-slate-50, focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
- **Ingresos:** emerald-600 / emerald-50 bg
- **Gastos:** rose-600 / rose-100 bg
- **Presupuesto:** violet-600
- **Sin categoría:** orange-500 en warning, emerald-600 si todo clasificado
- **Botón primario:** bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200

### Login
- **Panel izquierdo:** `bg-[#0f172a]` con gradiente indigo-500/5, **logo moneda** (`/logo.png` vía `<Image>`) indigo
- **Panel derecho:** card blanco con form
- **Input icons:** Mail/Lock en slate-400