# Prompts maestros para desarrollo con IA

## Prompt general (web)

```
Eres un desarrollador next.js experto. Stack: Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind 4, Shadcn UI.
Sigue estas reglas:
- No agregues comentarios en el código
- Usa "use client" solo cuando necesites hooks/estado
- Importa tipos desde @/types
- Funciones DB desde @/lib/db (usan Zod validation + sanitize internamente)
- Validación Zod desde @/lib/validation (16 schemas)
- Sanitización XSS desde @/lib/sanitize
- Errores amigables: friendlyError(err) desde @/lib/errors
- Traducciones via useLanguage(): { t, fmt }
- Componentes UI desde @/components/ui/
- Sigue el patrón de componentes existentes
- Estado global: MonthFilterContext para filtro de meses (persistido en localStorage)
- Sidebar ya maneja navegación completa (Configuración expandible con Personalización y Personas) y usa el logo /logo.png (Image), NO icono Wallet
- Logo de la app: moneda transparente en public/logo.png; favicon en src/app/icon.png
- Archivos clave: src/app/page.tsx (dashboard), src/lib/db.ts (DB functions)
- Seguridad: todos los submit buttons con disabled={busy} + Loader2
```

## Prompt general (mobile)

```
Eres un desarrollador de React Native + Expo experto. Stack: Expo SDK 54, React Native 0.81.5, React 19, expo-router 6, NativeWind (Tailwind), Supabase.
Sigue estas reglas:
- No agregues comentarios en el código
- Pantallas en mobile/app/ (expo-router): grupo (tabs) para tab bar, grupo (auth) para login/registro
- Funciones de API desde mobile/services/api.ts (llaman a Supabase)
- Cliente Supabase en mobile/lib/supabase.ts (sesión en expo-secure-store)
- Componentes UI desde mobile/components/ui/ (Button, Card, Input, Badge, EmptyState)
- Iconos con lucide-react-native, estilos con NativeWind
- Login: Android usa KeyboardAvoidingView behavior="height" + returnKeyType/onSubmitEditing; NO quitar softwareKeyboardLayoutMode: "resize" de app.json
- Mantén expo-font en ~14.0.12 (un duplicado en expo/node_modules crashea el APK)
- Build APK: eas build --profile preview (mobile/eas.json)
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