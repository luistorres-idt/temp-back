# Guía de Arquitectura: Autenticación de Gateways mediante API Keys

Este documento detalla la arquitectura de seguridad implementada en el sistema para asegurar la ingesta de telemetría proveniente de dispositivos de campo (Gateways IoT) a través del endpoint `/api/data`.

---

## 1. Fundamentos de Seguridad

Para garantizar un canal de comunicación confiable y mitigar ataques de suplantación de identidad (donde un agente externo inyecta mediciones falsas simulando ser un gateway legítimo), se ha implementado un esquema de autenticación por API Keys.

### Políticas de Diseño
*   **Sin expiración automática**: Las API Keys asignadas a dispositivos físicos no expiran automáticamente a corto plazo. Esto previene interrupciones abruptas en la ingesta y simplifica el mantenimiento en campo de los microcontroladores (ej: ESP32).
*   **Hashing Unidireccional en Servidor**: El servidor no almacena las API Keys en texto plano en la base de datos. En su lugar, calcula el hash SHA-256 de la API Key generada y lo almacena en el campo `tokenHash` del modelo `Gateway`. Ante una vulnerabilidad en la base de datos, las claves físicas de los dispositivos no se verán expuestas.
*   **Revocación Inmediata**: Cualquier administrador o superusuario del sistema puede revocar un token activo al instante, ya sea eliminando la clave o desactivando el gateway en el panel de control.
*   **Privilegio Mínimo**: El token asignado a un gateway únicamente tiene autorización para invocar el endpoint POST `/api/data` y escribir datos asociados a sus propios sensores. No otorga privilegios de lectura ni acceso a otras rutas de la API.

---

## 2. Flujos de Trabajo (Arquitectura)

### A. Generación y Almacenamiento de Claves
El flujo desde que un administrador solicita la clave hasta que se almacena y se le muestra se detalla a continuación:

```mermaid
sequenceDiagram
    participant Admin as Administrador (Frontend)
    participant API as Servidor Express (Backend)
    participant Crypto as Módulo Crypto (Backend)
    participant DB as Base de Datos (MySQL)

    Admin->>API: POST /api/gateways/:id/token
    Note over API: Valida rol de Administrador/Superusuario
    API->>Crypto: Generar Bytes Aleatorios (Secure Random)
    Crypto-->>API: Retorna token ("gw_prod_...")
    API->>Crypto: Calcular SHA-256 (token)
    Crypto-->>API: Retorna hash hex (tokenHash)
    API->>DB: Actualizar Gateway con tokenHash
    DB-->>API: Confirmación de actualización
    API-->>Admin: Retorna 200 OK con { token: "gw_prod_..." }
    Note over Admin: Muestra el token una sola vez al usuario
```

### B. Validación de Peticiones de Ingesta (Runtime)
El flujo que ejecuta el middleware para cada petición de ingesta de telemetría:

```mermaid
sequenceDiagram
    participant ESP32 as Gateway ESP32
    participant Middleware as autenticarGateway (Middleware)
    participant Crypto as Módulo Crypto (Backend)
    participant DB as Base de Datos (MySQL)
    participant Controller as DataControllerV2 (Endpoint)

    ESP32->>Middleware: POST /api/data (Headers: Authorization & Body: identificador)
    Note over Middleware: Extrae Token Bearer y la MAC (identificador)
    Middleware->>Crypto: Calcular SHA-256 (Token Bearer)
    Crypto-->>Middleware: Retorna tokenHash
    Middleware->>DB: Buscar Gateway por tokenHash
    alt Gateway no existe
        DB-->>Middleware: null
        Middleware-->>ESP32: 401 Unauthorized (Token no válido)
    else Gateway existe
        DB-->>Middleware: Objeto Gateway
        alt Gateway inactivo (estatus = false)
            Middleware-->>ESP32: 401 Unauthorized (Gateway inactivo)
        else La MAC (identificador) del body no coincide con el Gateway
            Middleware-->>ESP32: 401 Unauthorized (Identificador no corresponde)
        else Todo es válido
            Middleware->>Controller: Invocar next()
            Controller->>DB: Persistir mediciones en Data e InfoEstatus
            Controller-->>ESP32: 201 Created / 207 Partial
        end
    end
```

---

## 3. Detalles de Implementación en Código

### A. Estructura de Datos (Prisma)
Se añadió el campo `tokenHash` único e indexado al modelo `Gateway` en `prisma/schema.prisma`:

```prisma
model Gateway {
  id            Int           @id @default(autoincrement())
  identificador String        @unique // MAC o ID único
  nombre        String
  tokenHash     String?       @unique // Hash SHA-256 del token
  creado        DateTime      @default(now())
  actualizado   DateTime      @updatedAt
  estatus       Boolean       @default(true)
  idSeccion     Int
  seccion       Seccion       @relation(fields: [idSeccion], references: [id])
  dispositivos  Dispositivo[]
  infoEstatus   InfoEstatus[]
}
```

### B. Middleware de Validación
Implementado en `backend/src/middlewares/autenticacion/autenticacionGateway.ts`. Realiza la extracción del token, cálculo de hash en tiempo constante para evitar ataques de temporización (timing attacks) y comprobación de estatus del dispositivo.

### C. Registro en Rutas
El endpoint POST `/api/data` se encuentra protegido por este middleware en `backend/src/routes/index.ts` antes de procesarse en `DataControllerV2`.

---

## 4. Gestión desde la Interfaz de Usuario (Frontend)

La administración de las API Keys se realiza desde el módulo de administración en la pestaña **Gateways** (`front/src/modules/gateways/components/GatewaysTabla.vue`).

### Funcionalidades de la interfaz
1.  **Monitoreo visual del estado**: Se muestra un tag visual que indica si el gateway cuenta con una clave activa (`Configurada` en verde) o si carece de ella (`Sin clave` en amarillo).
2.  **Generación Segura**: Al pulsar sobre "Generar", el frontend ejecuta la petición al servidor y abre un diálogo modal instructivo. Este diálogo muestra el token resultante una única vez y provee un botón de copiado rápido al portapapeles.
3.  **Revocación Controlada**: Al pulsar sobre "Eliminar", el frontend despliega un aviso de alerta a través de un diálogo de confirmación de Naive UI para prevenir la invalidación accidental de las claves operativas de los microcontroladores en campo.
