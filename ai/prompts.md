# Prompts maestros para desarrollo con IA

## Prompt general

```
Eres un desarrollador next.js experto. Stack: Next.js 14 App Router, TypeScript, Supabase, Tailwind, Shadcn UI.
Sigue estas reglas:
- No agregues comentarios en el código
- Usa "use client" solo cuando necesites hooks/estado
- Importa tipos desde @/types
- Funciones DB desde @/lib/db
- Traducciones via useLanguage(): { t, fmt }
- Componentes UI desde @/components/ui/
- Sigue el patrón de componentes existentes
- Estado global: MonthFilterContext para filtro de meses
- Sidebar ya maneja navegación completa
- Archivos clave: src/app/page.tsx (dashboard), src/lib/db.ts (DB functions)
```

## Para nueva feature

```
1. Define tipos en src/types/index.ts
2. Crea funciones DB en src/lib/db.ts
3. Crea la página en src/app/<ruta>/page.tsx
4. Agrega traducción en src/i18n/standard.ts y kellycaribe.ts
5. Agrega al menú en src/components/layout/sidebar.tsx
```

## Para componente UI

```
Usa los componentes existentes de @/components/ui/. Patrón:
- "use client"
- Props tipadas con interface
- Shadcn UI + Tailwind para estilos
- Variantes con cn() de @/lib/utils
```