# Create Page Skill

Pasos para crear página completa:
1. "use client" al inicio
2. Importar hooks, componentes, DB functions, tipos, i18n
3. State inicial con useState
4. load function con useCallback (o async simple si no depende de props)
5. useEffect para carga inicial
6. Handlers para cada acción (submit, delete, etc.)
7. Return JSX con header + contenido
8. Traducciones en i18n/
9. Sidebar link si es nueva ruta principal