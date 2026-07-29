# Estrategia de Migración UI/UX para KellyCash

Este documento contiene la estrategia paso a paso y los prompts estructurados que debes utilizar con tu asistente de IA (como GitHub Copilot, Cursor, o ChatGPT) para adaptar el nuevo diseño a tu código existente **sin romper la funcionalidad**.

## La Estrategia: "Migración Incremental"

Dado que tienes el código original por un lado y la nueva propuesta HTML/Tailwind por otro, intentar fusionar todo de golpe resultará en errores y pérdida de lógica. La estrategia correcta es dividirlo en **componentes aislados**.

Sigue este orden estricto:

1.  **Fase 1: El Layout Base (Cascarón)**
    *   Migrar primero el `body`, el `Sidebar` (Menú lateral) y el `Header` (Cabecera superior).
    *   *Objetivo:* Tener la estructura de navegación funcionando con tus rutas actuales, pero con el nuevo diseño.
2.  **Fase 2: El Dashboard General**
    *   Migrar las tarjetas de KPI (Ingresos, Gastos, Balance).
    *   Migrar los gráficos (integrar la lógica de tus datos a los nuevos gráficos de Chart.js).
3.  **Fase 3: Las Vistas de Tablas (Ingresos / Gastos)**
    *   Aplicar el nuevo diseño de tabla (`table`, `thead`, `tbody`) a tus bucles de renderizado (ej. `.map()` si usas React/JS, o `foreach` si usas PHP).
    *   Adaptar los botones de "Editar/Eliminar" a la nueva iconografía.
4.  **Fase 4: Formularios y Modales (Nuevo Registro)**
    *   Adaptar tus formularios de creación de gastos/ingresos al nuevo diseño visual (inputs con Tailwind).

---

## Cómo usar el archivo `prompt_maestro.txt` incluido

He incluido un archivo llamado `prompt_maestro.txt`. Este archivo contiene el prompt perfecto y altamente estructurado.

**Flujo de trabajo recomendado en tu IDE (ej. VS Code con Copilot/Cursor):**

1.  Crea una carpeta llamada `_design_reference` en la raíz de tu proyecto.
2.  Mete ahí los archivos `.html`, `.css` y `.js` de la propuesta que te generé en el paso anterior.
3.  Abre el archivo de tu aplicación que quieres refactorizar (por ejemplo, `gastos.js` o `GastosView.jsx`).
4.  Abre el chat de tu IA y pega el contenido de `prompt_maestro.txt`.
5.  Modifica las partes del prompt que dicen `[AQUÍ...]` indicando qué vista estás migrando (ej. "La vista de tabla de gastos") y referencia el archivo de diseño correspondiente.

De esta forma, la IA tendrá el contexto de diseño (en la carpeta de referencia), tu código original (en el editor) y las reglas estrictas (en el prompt).
