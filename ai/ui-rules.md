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

### StatBadge (dashboard row)
```tsx
<div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 bg-background">
  <p className="text-[10px] text-muted-foreground">{label}</p>
  <p className={`text-xs font-bold tabular-nums ${color}`}>{value}</p>
  {icon && <div className="ml-auto">{icon}</div>}
</div>
```

### Botón filtro fechas (DateFilter)
- Forma píldora (`rounded-full`)
- Icono violeta (Calendar) + texto + chevron (ChevronDown)
- Diálogo con MultiMonthPicker
- Label dinámico: mes único o rango "Enero 2026 - Marzo 2026"

### MultiMonthPicker
- Input manual YYYY-MM + botón "+"
- Grid 4 columnas con meses del año
- Multi-selección: toggle on/off con check visual (bg-primary)
- Navegación anual: flechas izquierda/derecha
- Tags de meses seleccionados abajo
- Botón "Aplicar (N meses)" al fondo

### Gráfico Evolución anual (dashboard)
- Card con scroll horizontal si > 12 meses
- Barras verticales agrupadas: 4 colores por mes (ingresos, gastos, presupuesto, balance)
- Altura fija 120px, ancho mínimo 500px
- Tooltips con valores compactos (1.2k, 3.5M)
- Leyenda inferior con círculos de colores

### Budget progress bar
```tsx
<div className="flex items-center gap-3 rounded-lg border px-3 py-2 bg-muted/10">
  <span className="text-xs text-muted-foreground">Presupuesto:</span>
  <div className="flex-1 max-w-[200px]">
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  </div>
</div>
```
- verde < 80%, amarillo 80-100%, rojo > 100%

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