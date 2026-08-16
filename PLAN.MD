# Plan de Implementación — Dashboard Pulse Analytics

> Prioridad: tareas 1 y 4 (UX funcional) → tareas 2 y 3 (estética/animación)

---

## Tarea 1: Dashboard sin scroll (organizar información adicional)

### Problema actual
- El dashboard tiene datos extra (KPIs secundarios, tabla completa, filtros) que hacen scroll.

### Solución
1. **KPIs principales**: 4 KPIs en grid (2xl:grid-cols-4)
2. **Gráfica principal**: siempre visible, ocupa ancho completo
3. **Datos adicionales como cards expandibles**:
   - Crear un componente `<DashboardExpansionPanel>` con collapse/expand
   - KPI secundarios: ticket promedio, margen, etc. → dentro de panel expandable
   - Tabla de productos → dentro de panel expandable (con search/pagination)
   - Órdenes recientes → dentro de panel expandable
   - Filtros → siempre visibles, sticky
4. **Altura fija del viewport**: `min-h-screen` + `overflow-y-auto` eliminado del contenedor principal; cada panel gestiona su propio scroll interno con max-height.

### Archivos a modificar
- `src/components/dashboard/dashboard-view.tsx` — reestructurar layout con expansion panels
- `src/components/dashboard/data-tables.tsx` — el TopProductsTable y RecentOrdersTable dentro de panels con scroll interno (`max-h-96 overflow-y-auto`)
- `src/lib/dashboard-store.tsx` — podría agregar `expandedSections` al store

---

## Tarea 2: Transición 3D de cubo entre gráficas + gráficas adicionales

### Problema actual
- Cambio instantáneo entre gráfica generada y default (no 3D)

### Solución
1. **CubeTransition**: crear Three.js scene con un cubo que rota/zoom y cambia de textura
2. **Gráficas adicionales**: crear views para:
   - Ventas por día (barras diarias)
   - Ventas por producto (top N con barras horizontales)
   - Distribución de precios (histograma)
   - Órdenes por día (línea)
3. **CubeFlip**: cuando la voz solicita una gráfica distinta al default, animar el cubo que "da la vuelta" y muestra la nueva gráfica como textura de la cara opuesta
4. Usar `react-three-fiber` (R3F) + `@react-three/drei` para el cubo con reactividad

### Archivos a crear
- `src/components/charts/cube-transition.tsx` — Three.js cubo con shader de textura
- `src/components/charts/sales-by-day.tsx` — gráfico de barras diarias
- `src/components/charts/price-histogram.tsx` — histograma de precios
- `src/components/charts/orders-by-day.tsx` — línea de órdenes

### Archivos a modificar
- `src/components/dashboard/dashboard-view.tsx` — integrar CubeTransition

---

## Tarea 3: Three.js sutil + estilos HTML/CSS

### Estado actual
- `three-background.tsx` tiene partículas + icosaedro wireframe (ya existe)

### Mejoras
1. **Three.js interactivo**:
   - Las partículas reacten al hover (repelen o se iluminan)
   - El icosaedro wireframe rota más fluido y cambia color según la gráfica activa
   - Pequeños cubos flotantes que representan KPIs (altura = valor)
2. **Estilos visuales**:
   - Glassmorphism en tarjetas (backdrop-blur)
   - Gradients dinámicos según categoría seleccionada
   - Micro-animaciones en KPIs (count-up)
   - Hover states más vistosos

### Archivos a modificar
- `src/components/three-background.tsx` — añadir interacción
- `src/app/globals.css` — añadir glassmorphism y efectos

---

## Tarea 4: Mover micrófono de voz al dashboard

### Problema actual
- El micrófono (VoiceButton) está solo dentro del side panel chat
- El usuario quiere el micrófono debajo de "Conectado a tus datos" en el dashboard principal

### Solución
1. **Extractor del VoiceButton**: crear un componente `VoiceBar` compacto (mic + estado conectado)
2. **Posicionar en header**: debajo de "Conectado a tus datos" en `page.tsx`
3. **Side panel**: el VoiceButton completo (con transcripción, ChatInput) se queda en el side panel para uso extendido
4. **Estado compartido**: usar el store para sincronizar estado del micrófono entre header y side panel

### Archivos a modificar
- `src/components/voice-bar.tsx` (nuevo) — barra compacta de micrófono
- `src/app/page.tsx` — integrar VoiceBar en header
- `src/components/voice-button.tsx` — refactorizar para compartir lógica

---

## Orden de ejecución

| Ord | Tarea | Estimado | Complejidad |
|-----|-------|----------|-------------|
| 1 | Tarea 1 (scroll/panels) | 3 commits | Media |
| 2 | Tarea 4 (micrófono) | 2 commits | Baja-Media |
| 3 | Tarea 3 (Three.js + CSS) | 3 commits | Media-Alta |
| 4 | Tarea 2 (cube transition) | 4-5 commits | Alta |

---

## Commits esperados

1. `feat: layout sin scroll con panels expandibles para datos adicionales`
2. `feat: VoiceBar compacto en header debajo de "Conectado a tus datos"`
3. `refactor: compartir lógica de voz entre VoiceBar y VoiceButton`
4. `feat: Three.js interactivo + partículas reactivas + cubos KPI flotantes`
5. `feat: CubeTransition 3D entre gráficas + 3 gráficas nuevas (día, histograma, barras)`
