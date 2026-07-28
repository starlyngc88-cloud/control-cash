# Create Page Skill

Pasos para crear página completa:
1. "use client" al inicio
2. Importar hooks, componentes, DB functions, tipos, i18n, validation
3. State inicial con useState (incluir `busy` para submit)
4. load function con useCallback (o async simple si no depende de props)
5. useEffect para carga inicial
6. Handlers para cada acción (submit, delete, etc.) — usar friendlyError(err) en catch
7. Submit buttons con disabled={busy} + Loader2
8. Return JSX con header + contenido
9. Traducciones en i18n/
10. Sidebar link si es nueva ruta principal (si es sub-item de Configuración, usar expandible)