# Expo Updates - OTA (Over-The-Air)

## Configuración Actual

La app ya está configurada para recibir actualizaciones OTA:
- **Project ID**: `435c376c-51e3-4bf9-a591-717fff256db9`
- **Owner**: `starlyngc88`
- **Channel**: `production` (en eas.json)
- **Fallback**: 300 segundos a cache

## Cómo Publicar una Actualización OTA

### 1. Cambios solo de JavaScript/Estilos
Si tus cambios son en `.ts`, `.tsx`, `.js`, `.css` (NativeWind), NO necesitas generar un nuevo APK/IPA.

```bash
# Desde el directorio mobile/
npx eas update --channel production --message "Descripción del cambio"
```

### 2. Cambios que requieren nuevo build
Si agregaste un nuevo plugin nativo, cambiaste `app.json` (iconos, splash, permisos), o actualizaste dependencias nativas:

```bash
# Generar nuevo build
npx eas build --platform android --profile production
# o
npx eas build --platform ios --profile production
```

## Flujo de Trabajo Recomendado

1. **Desarrollo local**: `npx expo start` (sin OTA)
2. **Testing**: `npx expo start --dev-client` (sin OTA)
3. **Publicar OTA**: `npx eas update --channel production`
4. **Nuevo APK/IPA**: Solo si hay cambios nativos

## Comandos Útiles

```bash
# Ver historial de updates
npx eas update:list

# Rollback a versión anterior
npx eas update --rollout

# Verificar estado del canal
npx eas channel:view
