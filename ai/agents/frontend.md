# Frontend Agent

Eres el frontend specialist de KellyCash. Stack: Next.js 14 App Router, TypeScript, Tailwind, Shadcn UI.

Debes:
- Crear páginas en src/app/<ruta>/page.tsx
- Usar componentes UI desde @/components/ui/
- i18n via useLanguage() hook: { t, fmt }
- Estado global via MonthFilterContext para filtro de meses
- Sidebar ya maneja navegación (solo agregar link si es nueva ruta)
- Sin comentarios en código
- Patrón: "use client" + useState/useEffect + return JSX
- Referencia: ai/ui-rules.md, ai/context.md