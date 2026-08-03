# Roadmap

## Fase 1 - Core ✅
- [x] Dashboard con resumen
- [x] Ingresos CRUD
- [x] Gastos CRUD
- [x] Personas CRUD
- [x] Autenticación
- [x] Sidebar navegación

## Fase 2 - Presupuestos ✅
- [x] Plantillas de presupuesto
- [x] Categorías jerárquicas
- [x] Meses financieros
- [x] Dashboard por mes vs presupuesto
- [x] Filtro compartido de meses

## Fase 3 - Ahorros y Gastos Futuros ✅
- [x] Ahorros con movimientos
- [x] Gastos futuros planificados
- [x] Compromisos con pagos

## Fase 4 - Configuración ✅
- [x] Cambio de moneda (COP/EUR)
- [x] Cambio de idioma/dialecto
- [x] Cambio de contraseña
- [x] Gestión de usuarios permitidos
- [x] Guía de uso

## Fase 4b - Security Hardening ✅
- [x] Zod schemas para validación de todas las entidades
- [x] XSS sanitization utility
- [x] Errores amigables (sin exponer detalles técnicos)
- [x] RLS policies por usuario para todas las tablas
- [x] user_id column en todas las tablas
- [x] Security headers (X-Frame-Options, etc.)
- [x] Submit buttons deshabilitados durante operaciones

## Fase 4c - Dashboard Redesign ✅
- [x] StatBadge row con Ingresos/Gastos unificados
- [x] Gráfico vertical "Evolución anual" con 4 series
- [x] Layout 2 columnas (chart 2/3 + movimientos 1/3)
- [x] Budget progress bar horizontal al fondo
- [x] getYearlyData() function

## Fase 4d - Date Filter Overhaul ✅
- [x] MonthFilterContext global con persistencia localStorage
- [x] MultiMonthPicker con input manual + multi-select
- [x] DateFilter pill button reusable
- [x] Filtro compartido en Dashboard, Presupuestos, Ingresos, Gastos

## Fase 5 - Mobile 📱 (en progreso)
- [x] App nativa con **Expo SDK 54** (React Native + expo-router), carpeta `mobile/`
- [x] Login/registro (teclado no tapa el form en Android)
- [x] Pantallas principales: Dashboard, Ingresos, Gastos, Presupuestos, Hucha, Gastos Futuros, Compromisos, Personas, Ajustes, Personalización
- [x] Sesión con expo-secure-store, misma base Supabase que la web
- [x] Branding mobile: icon, adaptive-icon, splash (moneda transparente)
- [x] Build APK con EAS Build (profile `preview`) + fix crash expo-font
- [ ] Notificaciones de vencimientos
- [ ] Soporte offline (offline-first)
- [ ] Escaneo de facturas con OCR
- [ ] Widgets de resumen rápido

## Fase 6 - Reportes y Analytics 📊
- [ ] Reportes mensuales PDF
- [ ] Gráficos comparativos
- [ ] Exportación CSV
- [ ] Tendencias y predicciones

## Fase 7 - Features avanzadas 🚀
- [ ] **Abonar/sacar en Gastos Futuros** (funcionar como hucha/alcancía): registro pendiente, esperando terminar de probar el APK actual
- [ ] Objetivos financieros
- [ ] Patrimonio familiar
- [ ] Adjuntos a movimientos
- [ ] Presupuesto compartido multi-usuario
- [ ] Reglas de ahorro automático