## Context

El sistema actual tiene completamente funcional el flujo de compra de punta a punta, la FSM de pedidos y la pasarela de pagos simulada de Mercado Pago. Sin embargo, no existe visibilidad comercial de las ventas ni capacidad de control sobre los usuarios y la configuración global del negocio. El Panel Administrativo centralizará estas necesidades asegurando un control seguro mediante roles `ADMIN` y `PEDIDOS`.

## Goals / Non-Goals

**Goals:**
*   Proveer un Dashboard analítico interactivo con métricas comerciales agregadas (`recharts`) para `ADMIN` y `PEDIDOS`.
*   Implementar un ABM / Gestión avanzada de usuarios con filtros de búsqueda y reasignación de roles (RBAC) exclusiva para `ADMIN`.
*   Garantizar la invalidación atómica inmediata de sesiones de usuarios desactivados (de-auth de JWT activo en base de datos + revocación total de refresh tokens).
*   Desarrollar una tabla dinámica key-value en base de datos para la configuración del sistema (ej: costo de envío y estado de apertura del local).
*   Asegurar que todas las APIs administrativas cuenten con chequeo estricto de roles en el backend mediante `require_role(["ADMIN"])`.

**Non-Goals:**
*   Implementar reportería en archivos descargables (PDF/Excel) en esta etapa.
*   Crear integraciones automáticas de marketing (newsletters) o soporte al cliente en tiempo real.

## Decisions

### 1. Consultas Analíticas Agregadas en Postgres (SQLModel)
*   **Decisión**: Utilizar agregaciones nativas a nivel base de datos (`func.sum`, `func.count` y `func.date_trunc` de SQLAlchemy/Postgres) en lugar de mapear y agrupar registros pesados en memoria con Python.
*   **Razón**: Permite calcular el total facturado, pedidos por estado y evolución histórica de ventas con tiempos de respuesta óptimos (<5ms en Postgres), ahorrando ancho de banda y uso de CPU en el backend.
*   **Alternativa considerada**: Cargar todos los registros del último mes y agruparlos en memoria con Pandas o bucles. Descartada por ineficiencia de escalado.

### 2. Invalidación Atómica e Inmediata de Sesiones
*   **Decisión**: Al desactivar un usuario (`activo = False`), la transacción del UoW también actualizará todos sus `RefreshToken` asignándoles `revoked = True`. El middleware `get_current_user` en cada llamada API ya consulta el estado `user.activo`, logrando que la revocación de acceso e imposibilidad de refresco sean inmediatas y absolutas.
*   **Razón**: Evita la complejidad de implementar listas negras en Redis para esta fase del MVP y garantiza el cumplimiento estricto de los estándares de seguridad corporativos.

### 3. Configuración del Sistema Dinámica (Key-Value)
*   **Decisión**: Crear el modelo `Configuracion` (tabla física key-value: `key`, `value`, `description`, `updated_at`). Al cotizar un pedido, el sistema leerá el valor de `costo_envio` persistido en esta tabla dinámicamente mediante el UoW.
*   **Razón**: Permite que el negocio altere el costo de envío o cierre las ventas del local online de forma instantánea sin requerir modificaciones en el código o reinicios del servidor.

### 4. Visualización Gráfica Responsiva (Recharts)
*   **Decisión**: Utilizar la biblioteca `@types/recharts` y `recharts` en el frontend, integrada con Tailwind CSS y Outfit font para lograr una estética premium (gradientes suaves de color, tooltips interactivos con desenfoque de fondo y diseño dark-mode coherente).

## Risks / Trade-offs

*   **[Riesgo: Rendimiento de Agregaciones]** → A medida que el volumen de pedidos crezca a decenas de miles de registros, las queries de dashboard agrupadas podrían ralentizarse.
    *   *Mitigación*: Crear un índice compuesto en la base de datos sobre (`pedido.estado_codigo`, `pedido.created_at`) y (`pago.status`, `pago.created_at`).
*   **[Riesgo: Sesiones Fantasma]** → Si un usuario con JWT válido es modificado en su rol (ej: de Admin a Cliente), su token de acceso actual (válido por 15 minutos) conservaría sus claims de rol viejos hasta su expiración si solo se valida el JWT firmado.
    *   *Mitigación*: Las llamadas a dependencias de seguridad consultan la base de datos a través de `UsuarioRepository.get_by_id(int(user_id))` en cada petición, por lo que cualquier cambio de rol impacta de forma inmediata e invalida permisos antiguos en la siguiente llamada.
