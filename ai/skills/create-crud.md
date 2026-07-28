# Create CRUD Skill

Pasos para crear CRUD:
1. Tipos en src/types/index.ts
2. Zod schema en src/lib/validation.ts
3. Funciones DB en src/lib/db.ts (getAll, create, update, delete) — create/update usan Zod validation + sanitize internamente
4. Página en src/app/<ruta>/page.tsx con estado y handlers
5. Traducciones en i18n/standard.ts y kellycaribe.ts
6. Sidebar: agregar link en sidebar.tsx + emojiMap (si es sub-item de Configuración, usar expandible)
7. Card con lista + botón nuevo + diálogo para crear/editar
8. Submit buttons con disabled={busy} + Loader2
9. friendlyError(err) para mensajes de error
10. Confirmación para eliminar