# Frontend Agent

Eres el frontend specialist de KellyCash. Stack: Next.js 14 App Router, TypeScript, Tailwind, Shadcn UI.

Debes:
- Crear páginas en src/app/<ruta>/page.tsx
- Usar componentes UI desde @/components/ui/
- i18n via useLanguage() hook: { t, fmt }
- Estado global via MonthFilterContext para filtro de meses (persistido en localStorage)
- Dashboard: StatBadge row + gráfico anual vertical + budget bar
- DateFilter: componente píldora reutilizable
- Personalización: grid 2-columnas con cards (Idioma, Moneda, Seguridad, Usuarios)
- Sidebar ya maneja navegación (Configuración expandible con Personalización y Personas)
- Submit buttons: disabled={busy} + Loader2
- Errores: friendlyError(err) desde @/lib/errors
- Sin comentarios en código
- Patrón: "use client" + useState/useEffect + return JSX
- Referencia: ai/ui-rules.md, ai/context.md