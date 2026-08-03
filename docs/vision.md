# Visión - KellyCash

## Propósito
Aplicación de finanzas familiares multi-persona que reemplaza las hojas de Excel tradicionales para el control de gastos e ingresos del hogar.

## Usuarios objetivo
- Familias que gestionan finanzas compartidas
- Parejas que quieren controlar gastos conjuntos
- Personas que buscan simplificar su presupuesto mensual

## Diferenciadores
- Multi-persona: cada ingreso/gasto se asigna a una persona
- Presupuesto por plantilla: define una vez, genera meses automáticamente
- Sin esfuerzo: dashboard visual con mínima configuración
- Dialecto caribeño opcional: lenguaje familiar y cercano
- Offline-first (futuro): app mobile con soporte sin conexión

## Principios de diseño
1. **Simple > Complejo**: una acción por pantalla, mínimos clicks
2. **Visible > Oculto**: la información importante siempre a la vista
3. **Rápido > Bonito**: rendimiento sobre animaciones elaboradas
4. **Familiar > Formal**: lenguaje cercano, tono relajado
5. **Seguro > Confiado**: validación Zod, sanitización XSS, RLS, errores amigables

## Identidad visual (Refactorizado 2026)
- **Logo:** moneda con fondo transparente (`assets/logo-transparent.png`), aplicado en web (login, sidebar, favicon 256px) y mobile (icon, adaptive-icon, splash)
- **Esquema de colores unificado** basado en `_design_reference/index.html`:
  - Primario: indigo-600 (`#4f46e5`)
  - Sidebar: `bg-[#0f172a]`
  - Fondo: `bg-[#f8fafc]`
  - Cards: white con `rounded-xl border-slate-100 shadow-sm`
- **Login split-screen**: panel oscuro (sidebar style) con logo Image + form en card blanco
- **Vistas CRUD con patrón común**: KPI cards + búsqueda + lista agrupada por categoría expandible
- **Diálogos de confirmación** consistentes para todas las operaciones de eliminación
- **Doble clasificación en gastos**: rubro (budget categories) + categoría de gastos (expense categories)
- **Creación inline de categorías** desde el formulario con optimist state update
- **Errores específicos de Supabase** visibles al usuario en login

## Logros del refactor
- Migración visual completa al nuevo design system
- Unificación del patrón de CRUD views (5 vistas comparten misma estructura)
- Eliminación de `confirm()` nativo del navegador en favor de diálogos personalizados
- Categorías siempre piden confirmación al eliminar
- friendlyError() ahora pasa strings sin modificarlos
- Errores de autenticación más descriptivos (Email not confirmed, rate limit, etc.)

## Mobile (en producción)
- App nativa con **Expo SDK 54** (React Native + expo-router), carpeta `mobile/`
- Misma base de datos Supabase que la web (sincronización directa)
- Pantallas: Dashboard, Ingresos, Gastos, Presupuestos, Hucha (ahorros), Gastos Futuros, Compromisos, Personas, Ajustes, Personalización
- Login con `behavior="height"` en Android y `softwareKeyboardLayoutMode: "resize"` (teclado no tapa el form)
- Sesión persistida con expo-secure-store
- Build: EAS Build (`preview` = APK, `production` = AAB)

## Futuro
- Notificaciones de vencimientos
- Escaneo de facturas con OCR
- Widgets de resumen rápido
- Soporte offline (offline-first)