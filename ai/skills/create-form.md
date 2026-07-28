# Create Form Skill

Pasos para crear formularios:
- Usar Label + Input de @/components/ui/
- Select nativo (no shadcn select) con className consistente
- Fecha con input type="date"
- Validar datos con Zod schema desde @/lib/validation antes de enviar
- Sanitizar inputs con sanitize() desde @/lib/sanitize
- Botón submit con Button component, `disabled={busy}` + Loader2
- Errores: catch(err) → friendlyError(err) para mostrar mensaje amigable
- Form dentro de DialogContent (crear) o página dedicada (editar)
- Estado local para cada campo
- Submit: await DB function, cerrar diálogo, recargar lista