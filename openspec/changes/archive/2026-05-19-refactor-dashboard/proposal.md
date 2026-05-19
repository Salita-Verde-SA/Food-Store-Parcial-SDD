## Why

El módulo de administración y sus páginas del dashboard (como `DashboardPage.tsx`) presentan desvíos técnicos respecto a las convenciones arquitectónicas del proyecto y las directrices documentadas en la skill `dashboard-crud-page` (como la desestructuración directa de Zustand, falta de tipado rígido de selectores, o el manejo manual de peticiones asíncronas). Además, existe un error crítico en el orden de los `@import` de CSS en `index.css` que bloquea el build y re-optimización del bundle en desarrollo de Vite.

Esta propuesta busca estandarizar la arquitectura técnica de las vistas administrativas y resolver los bloqueos de PostCSS, preservando el diseño visual de glassmorphic premium, colores y fuentes intactos.

## What Changes

- **PostCSS Import Fix**: Reordenar de forma definitiva las directivas `@import` en `frontend/src/index.css` colocando la importación de tipografías externas de Google Fonts al inicio del bundle, antes de `@import "tailwindcss"`, para subsanar el error físico de PostCSS.
- **Standard-compliant Zustand Selector Patterns**: Refactorizar la extracción de datos desde Zustand en las pantallas de administración (como `DashboardPage.tsx`, `UsuariosPage.tsx`, `ConfiguracionPage.tsx`) implementando selectores atómicos tipados y `useShallow` de Zustand para evitar renders innecesarios.
- **Hook Standards**: Adaptar el flujo de datos para estructurar hooks conformes con el React Compiler (llamadas incondicionales, memorización explícita con dependencias completas del objeto de diálogo).
- **Consistencia Visual y de Diseño**: **NO alterar** el diseño estético de cristal, la tipografía, los colores ni las animaciones existentes; el cambio es 100% estructural, técnico y de legibilidad interna.

## Capabilities

### New Capabilities
*Ninguna.* Este cambio es un refactor puramente arquitectónico y de infraestructura frontend.

### Modified Capabilities
- `admin`: Actualización de componentes y páginas internas del dashboard administrativo para consolidar la arquitectura de componentes React + Zustand.

## Impact

- `frontend/src/index.css`: Ajuste de orden de imports CSS.
- `frontend/src/pages/admin/DashboardPage.tsx`: Estandarización de selectores de Zustand y hooks asociados.
- `frontend/src/pages/admin/UsuariosPage.tsx` y `frontend/src/pages/admin/ConfiguracionPage.tsx`: Alineamiento de Zustand hooks con selectores específicos.
