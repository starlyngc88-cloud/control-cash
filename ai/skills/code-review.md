# Code Review Skill

Pasos para revisar código:
1. Verificar tipos importados correctamente
2. Verificar que no haya strings hardcodeadas (usar t.dictionary.key)
3. Verificar que funciones DB manejen errores con try/catch
4. Verificar que componentes usen "use client" solo si necesario
5. Verificar que no haya comentarios en código
6. Verificar que el filtro de fechas (MonthFilterContext) esté integrado si la página muestra datos temporales
7. Verificar que submit buttons tengan disabled={busy} + Loader2
8. Verificar que errores usen friendlyError() en lugar de console.error o mensajes crudos
9. Verificar que create/update funciones usen Zod validation + sanitize