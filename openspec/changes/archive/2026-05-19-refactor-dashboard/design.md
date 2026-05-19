## Context

El panel de administración y sus páginas asociadas presentan ciertos desvíos en la implementación del estado global con Zustand (desestructurando directamente los stores o cargando hooks sin selectores atómicos) que incrementan los re-renders innecesarios y violan el estándar de la skill `dashboard-crud-page`. Además, el frontend sufre un error de compilación físico en el procesador PostCSS de Vite debido a que la directiva `@import url(...)` de Google Fonts está ubicada debajo de `@import "tailwindcss"`.

## Goals / Non-Goals

**Goals:**
- Resolver de forma definitiva el error físico de PostCSS reordenando los imports CSS en `frontend/src/index.css`.
- Estandarizar la extracción de Zustand en las páginas del dashboard administrativo (`DashboardPage.tsx`, `UsuariosPage.tsx`, `ConfiguracionPage.tsx`) usando selectores atómicos o selectores envueltos en `useShallow` para evitar ciclos de render redundantes.
- Mantener la integridad de los hooks de React (memorizaciones conformes al React Compiler).
- **Mantener el diseño visual, colores, tipografía, estilo de cristal, gráficos, logos y sombras 100% intactos**.

**Non-Goals:**
- Modificar componentes visuales, tipografías, gradientes o paleta de colores.
- Crear nuevos endpoints en el backend.
- Cambiar la lógica del negocio o la máquina de estados (FSM) de pedidos.

## Decisions

### Decisión 1: Reordenamiento del import en CSS
- **Qué**: Mover `@import url('https://fonts...')` arriba de `@import "tailwindcss";` en `frontend/src/index.css`.
- **Por qué**: Al expandirse el macro de Tailwind v4, inyecta miles de líneas de CSS antes de la directiva de la fuente. Moverlo al inicio del bundle cumple estrictamente con el estándar W3C de CSS y evita que PostCSS rechace el build.

### Decisión 2: Selectores Atómicos en Zustand
- **Qué**: Reemplazar la desestructuración destructiva del store (`const { data, isLoading } = useAuthStore()`) por selectores específicos (`const user = useAuthStore(state => state.user)`).
- **Por qué**: Previene re-renders innecesarios de componentes cuando cambian partes del store que no están siendo observadas.

### Decisión 3: Memorizaciones Conformes con React Compiler
- **Qué**: Configurar dependencias completas de objetos de estado (ej. `deleteDialog` en lugar de `deleteDialog.open`) dentro de los arrays de dependencias de `useMemo` o `useCallback`.
- **Por qué**: Asegura que el compilador de React optimice adecuadamente el árbol virtual de componentes y evite advertencias de lint.

## Risks / Trade-offs

- **[Riesgo]** Errores tipados al alterar la forma en que los stores se vinculan.
  - *Mitigación*: Verificar rigurosamente los tipos TypeScript en tiempo de diseño y realizar testeos locales inmediatos.
- **[Riesgo]** Alterar sin querer el diseño visual.
  - *Mitigación*: No tocar clases CSS semánticas de Tailwind ni colores de los charts de Recharts, limitando la refactorización puramente al plano del comportamiento/código React.
