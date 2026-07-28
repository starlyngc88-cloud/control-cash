# Create Form Skill

Pasos para crear formularios:
- Usar Label + Input de @/components/ui/
- Select nativo (no shadcn select) con className consistente
- Fecha con input type="date"
- Botón submit con Button component
- Form dentro de DialogContent (crear) o página dedicada (editar)
- Estado local para cada campo
- Submit: await DB function, cerrar diálogo, recargar lista