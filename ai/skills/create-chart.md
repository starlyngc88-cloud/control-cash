# Create Chart Skill

Para crear gráficos en KellyCash:
- Usar barras con divs (no librerías externas)
- Barras horizontales: style={{ width: `${porcentaje}%` }}
- Barras verticales agrupadas (para Evolución anual): 4 colores por mes (ingresos, gastos, presupuesto, balance)
- Gráfico anual: altura fija 120px, min-width 500px con overflow-x-auto
- Ancho de barra: style={{ width: `${porcentaje}%` }} (horizontal) o style={{ height: `${pct}px` }} (vertical)
- Colores semánticos: green (ingresos), red (gastos/exceso), violet (presupuesto), blue (balance positivo)
- Tooltips con texto compacto (1.2k, 3.5M)
- Leyenda con círculos de colores
- Responsive: width full en mobile