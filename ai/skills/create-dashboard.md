# Create Dashboard Skill

Para crear dashboards:
- Header con ícono + título + subtítulo + filtro de fechas (DateFilter component píldora)
- StatBadge row: 3 items en grid-cols-3 (Ingresos/Gastos unificados, Balance, Presupuesto)
- Layout 2 columnas (lg:grid-cols-3): chart 2/3 + movimientos 1/3
- Gráfico "Evolución anual": barras verticales agrupadas (ingresos/gastos/presupuesto/balance), filtrado por months
- Barra de progreso del presupuesto horizontal al fondo (verde < 80%, amarillo 80-100%, rojo > 100%)
- Usar useMonthFilter() para filtro compartido (persistido en localStorage)
- Cargar datos con useEffect + useCallback + Promise.all([getDashboardData, getYearlyData])
- StatBadge de Presupuesto: link a /presupuestos/[id] si hay 1 mes seleccionado