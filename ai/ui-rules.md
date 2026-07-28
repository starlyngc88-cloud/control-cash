# Reglas de UI/UX - KellyCash

## Inspiración
- Notion (clean, minimal)
- Linear (transiciones, estados)
- Vercel (geometrico, sombras sutiles)

## Principios generales
- Sin scroll en sidebar (todo visible)
- Cards con hover: `hover:shadow-md hover:-translate-y-0.5`
- Bordes redondeados `rounded-lg` o `rounded-xl`
- Transiciones suaves `transition-all duration-200`
- Inputs con `focus:border-ring focus:ring-3 focus:ring-ring/50`

## Patrones de componentes

### Cards
```tsx
<Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">Título</CardTitle>
  </CardHeader>
  <CardContent>
    {/* contenido */}
  </CardContent>
</Card>
```

### Botón filtro fechas
- Forma píldora (`rounded-full`)
- Icono violeta + texto + chevron
- Diálogo con MultiMonthPicker

### Listas de items
- `flex items-center justify-between`
- Hover: `hover:bg-muted/30` o `hover:bg-green-50/70`
- Items separados por `border-t border-border/50`

### Diálogos
- Usar `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
- Formularios dentro del diálogo
- Botón submit `w-full`

### Sidebar
- Fondo: `bg-sidebar` (variable CSS)
- Item activo: `bg-sidebar-accent text-sidebar-accent-foreground shadow-sm`
- Item hover: `hover:bg-sidebar-accent/50 hover:translate-x-0.5`
- Submenú: indentado con `border-l-2 border-muted pl-2 ml-3`

## Colores semánticos
- Ingresos: green-600 / green-100 bg
- Gastos: red-600 / red-100 bg
- Presupuesto: violet-600
- Balance: blue-600
- Warning (gasto > 80%): yellow-500
- Exceso (gasto > 100%): red-500

## Responsive
- Sidebar fijo 56 (o 10 colapsado)
- Main content: `flex-1 p-6 overflow-auto`
- Grids responsive: `md:grid-cols-2 lg:grid-cols-3`
- Sin scroll horizontal