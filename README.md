# KellyCash — Presupuestos Familiares

App web para controlar gastos del hogar como un Excel, pero más fácil.

---

## Cómo usar

### 1. Personas
- **Qué es:** Los miembros de la familia (ej: Juan, María)
- **Cómo:** Ve a Personas → escribe el nombre → Guardar
- **Para qué:** Cada gasto/ingreso se asigna a una persona

### 2. Ingresos
- **Qué es:** El dinero que entra (sueldos, freelance, etc.)
- **Cómo:** Ve a Ingresos → selecciona persona, escribe monto y concepto → Guardar
- **Para qué:** Saber cuánto entra al mes

### 3. Gastos
- **Qué es:** El dinero que sale (mercado, transporte, etc.)
- **Cómo:** Ve a Gastos → selecciona persona, escribe monto, concepto y **rubro** → Guardar
- **Rubro (opcional):** Asocia el gasto a una categoría del presupuesto (ej: "Mercado")

### 4. Presupuestos → Plantillas
- **Qué es:** Una plantilla define tus rubros y cuánto planeas gastar en cada uno
- **Cómo:**
  1. Ve a Presupuestos → Nueva plantilla → pónle nombre (ej: "Plantilla Base")
  2. Agrega rubros: escribe nombre (ej: "Mercado") y monto (ej: 450) → Rubro
  3. Repite para cada rubro (Transporte, Ocio, Salud, Colegio...)
- **Para qué:** Reutilizar la misma estructura cada mes

### 5. Presupuestos → Meses financieros
- **Qué es:** Un mes concreto con los rubros de una plantilla
- **Cómo:** En la plantilla → click en "Mes" → selecciona el mes (ej: Julio 2026) → Crear mes
- **Para qué:** Ver el dashboard de ese mes

### 6. Dashboard del mes
- **Qué es:** Resumen visual de cómo vas en cada rubro
- **Cómo:** En Presupuestos → click en "Ver detalle" del mes
- **Columnas:**
  - Ppto. = lo que presupuestaste
  - Gastado = lo que llevas gastado
  - Disponible = lo que te queda
  - Exceso = si gastaste de más
  - Estado = % consumido con color:
    - Verde ✅ = dentro del presupuesto
    - Amarillo ⚠️ = más del 80% usado
    - Rojo 🔴 = presupuesto superado
- **Barra superior:** Muestra Ingresos totales, Presupuestado, Gastado y Balance del mes

### 7. Dashboard principal
- **Qué es:** Resumen rápido del mes actual
- **Muestra:** Ingresos, Gastos y Balance del mes en curso + últimos movimientos

---

## Para hacer un video de 30 segundos

Usa **OBS Studio** (gratis, Windows/Mac/Linux):

1. Abre OBS → + en Fuentes → Captura de ventana → selecciona el navegador
2. Acomoda la ventana para que se vea la app
3. Click en **Grabar** y haz el recorrido rápido:
   - 5s: Abrir Dashboard
   - 5s: Ir a Gastos y mostrar un gasto con rubro
   - 10s: Ir a Presupuestos → mostrar plantilla → Ver detalle del mes
   - 10s: Mostrar dashboard del mes (tabla de rubros con colores)
4. Click en **Detener grabación**
5. El video se guarda en Videos/

Si quieres algo más automático, prueba **Loom** (loom.com) — gratis, graba pantalla + cámara + voz y genera link al instante.
