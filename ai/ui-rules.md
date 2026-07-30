# Reglas de UI/UX - KellyCash (Refactorizado)

## Inspiración
- Notion (clean, minimal)
- Linear (transiciones, estados)
- Vercel (geometrico, sombras sutiles)
- **Design Reference:** `_design_reference/index.html` — identidad visual unificada

## Principios generales
- Sin scroll en sidebar (todo visible)
- Cards con `rounded-xl border border-slate-100 shadow-sm`
- Bordes redondeados `rounded-lg` (inputs, botones) o `rounded-xl` (cards)
- Transiciones suaves `transition-all duration-200`
- Fondo página: `bg-[#f8fafc]`
- Inputs: `bg-slate-50 border-slate-200`, focus: `bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`
- Iconos decorativos dentro de inputs (Mail, Lock, Search) con `absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none`

## Patrones de componentes

### KPI Cards (gastos, ingresos, futuros, dashboard)
```tsx
<div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
  <div className="flex justify-between items-start">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">Label</p>
      <h3 className="text-3xl font-bold text-{color}-600">{fmt(value)}</h3>
    </div>
    <div className="p-3 bg-{color}-50 rounded-lg text-{color}-600">
      <Icon className="size-6" />
    </div>
  </div>
</div>
```

### Vista agrupada por categoría (gastos, ingresos, futuros, ahorros, compromisos)
```tsx
<div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
  <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200">
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Título por categoría</span>
    <button className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
      {allExpanded ? "Contraer todo" : "Expandir todo"}
    </button>
  </div>
```

- **Header de categoría:** `bg-slate-50`, icono expandir, botones editar/eliminar, nombre, count, total
- **Item row:** icono redondo bg-{color}-100, descripción + fecha, persona, monto, botones editar/eliminar

### Botón primario (header actions)
```tsx
<button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2">
```

### Búsqueda
```tsx
<div className="relative">
  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
  <input className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
</div>
```

### Select
```tsx
<select className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm shadow-xs transition-colors appearance-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none">
```

### Diálogo de confirmación para eliminar categoría
```tsx
<Dialog open={!!catToDelete} onOpenChange={(v) => { if (!v) setCatToDelete(null) }}>
  <DialogContent>
    <p>¿Eliminar la categoría <strong>{catToDelete?.name}</strong>?</p>
    {related.length > 0 && <Lista de elementos relacionados />}
    {related.length === 0 && <p>No hay elementos asociados.</p>}
    <div className="flex justify-end gap-2">
      <DialogClose render={<Button variant="outline">Cancelar</Button>} />
      <Button variant="destructive" onClick={confirmDeleteCat}>Eliminar</Button>
    </div>
  </DialogContent>
</Dialog>
```

### Login — Split screen
```tsx
<div className="min-h-screen flex bg-[#f8fafc]">
  {/* Panel izquierdo oscuro */}
  <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] flex-col items-center justify-center">
    <Wallet className="size-10 text-indigo-400" />
    <h1 className="text-4xl font-bold text-white">KellyCash</h1>
    <p className="text-slate-400 text-lg">La platica bajo control</p>
  </div>
  {/* Panel derecho */}
  <div className="flex-1 flex items-center justify-center">
    <Card className="bg-white rounded-xl border border-slate-100 shadow-sm p-8">
      <Form />
    </Card>
  </div>
</div>
```

### Diálogo de confirmación para eliminar (reemplaza `confirm()` nativo)
- Usar `<Dialog>` con `variant="destructive"` en el botón de confirmación
- Mostrar elementos relacionados si existen
- Botón Cancelar con `DialogClose` + `variant="outline"`
- Siempre preguntar, incluso cuando no hay elementos asociados

## Colores semánticos
- Ingresos: emerald-600 / emerald-50 bg
- Gastos: rose-600 / rose-100 bg
- Presupuesto: violet-600
- Rubro (budget category): indigo-500 / indigo-50 bg
- Primario (botones, acentos): indigo-600 / indigo-700 hover
- Sin categoría: orange-500 bg-orange-50 (warning), emerald-600 bg-emerald-50 (todo ok)
- Sidebar: `bg-[#0f172a]`
- Warning (gasto > 80%): yellow-500
- Exceso (gasto > 100%): red-500

## Responsive
- Sidebar fijo 64 (o 16 colapsado)
- Main content: `flex-1 flex flex-col h-screen overflow-hidden`
- Grids responsive: `md:grid-cols-2 lg:grid-cols-3 lg:grid-cols-4`
- Login: panel izquierdo oculto en mobile (`hidden lg:flex`)