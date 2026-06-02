# Documentación de Server-Sent Events (SSE) (Tiempo Real)

El sistema de transmisión en tiempo real de telemetría ha sido migrado de **WebSockets (Socket.IO)** a **Server-Sent Events (SSE)**. Esta arquitectura es unidireccional (del servidor al cliente) y elimina la necesidad de mantener conexiones bidireccionales pesadas, funcionando sobre HTTP estándar.

---

## Arquitectura

```
  Controller / Service (Ingesta IoT)
                 |
                 v
  DomainEvent (TELEMETRIA_RECIBIDA)
                 |
                 v
   EventBus.subscribe() --> OnTelemetriaRecibida (Handler)
                                   |
                                   v
             TelemetriaStreamController.enviarTelemetria(data)
                                   |
                                   +---> Transmisión SSE (GET /api/monitoring/telemetria/stream)
                                              |
                                              v
                                     Clientes conectados
```

**Componentes principales:**

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `TelemetriaStreamController` | `src/modules/monitoring/infrastructure/http/TelemetriaStreamController.ts` | Administra las conexiones SSE activas y distribuye los eventos de telemetría aplicando filtros de sucursales. |
| `OnTelemetriaRecibida` | `src/modules/monitoring/application/event-handlers/OnTelemetriaRecibida.ts` | Handler de dominio que reacciona a las telemetrías ingeridas y las pasa al `TelemetriaStreamController`. |
| Middleware Auth | `src/middlewares/autenticacion/autenticacion.ts` | Valida el token JWT de acceso (soportando tanto la cabecera `Authorization` como el parámetro de consulta `token`). |

---

## Conexión desde el Cliente (Frontend)

El cliente utiliza la clase nativa del navegador `EventSource`. No se requiere instalar librerías adicionales.

### Conexión básica y autenticación
Debido a que `EventSource` no permite enviar cabeceras personalizadas de forma nativa, el token JWT de acceso se pasa mediante el parámetro `token` en la URL de consulta. Las sucursales permitidas se resuelven automáticamente en el servidor a partir del payload del token.

```javascript
const token = localStorage.getItem("tokenAccess");

// Construir URL con el token
const queryParams = new URLSearchParams({ token });

const eventSource = new EventSource(`http://localhost:3000/api/monitoring/telemetria/stream?${queryParams.toString()}`);

// Escuchar evento de confirmación de conexión
eventSource.addEventListener("connected", (event) => {
  const data = JSON.parse(event.data);
  console.log("SSE conectado:", data.message);
});

// Escuchar nuevas telemetrías
eventSource.addEventListener("telemetria:nueva", (event) => {
  const data = JSON.parse(event.data);
  console.log("Nueva telemetría recibida:", data);
});

// Cerrar conexión (limpieza al desmontar componentes)
const desuscribir = () => {
  eventSource.close();
};
```

---

## Servidor SSE (Backend)

### Endpoint: `GET /api/monitoring/telemetria/stream`
Este endpoint está protegido. Requiere un token válido en `req.query.token`.

#### Parámetros soportados en URL:
- `token` (Requerido): JWT access token de usuario.

#### Resolución de sucursales (Filtros de Seguridad):
El servidor determina a qué sucursales tiene acceso el usuario a partir del token JWT:
1. Si el usuario pertenece a una sucursal fija (`usuario.sucursal.id`), solo se le envían eventos de esa sucursal.
2. Si el usuario pertenece a un cliente corporativo (`usuario.cliente.id`), se le envían los eventos de todas las sucursales de dicho cliente.
3. Si el usuario no tiene sucursal ni cliente asignado (rol `superusuario`), se le envían eventos de todas las sucursales de la red.

### Mantener Conexiones Activas (Keep-Alive / Heartbeat)
El servidor envía comentarios HTTP vacíos (`:\n\n`) cada 15 segundos para mantener vivas las conexiones a través de firewalls o proxies y detectar desconexiones inmediatas.

---

## Eventos Emitidos por el Servidor

### 1. `connected`
Enviado inmediatamente al establecer la conexión con éxito.
- **Payload:** `{ status: "connected", message: "Conectado a la transmisión de telemetría" }`

### 2. `telemetria:nueva`
Enviado cada vez que un dispositivo IoT reporta datos para una de las sucursales monitoreadas.
- **Payload:**
  ```json
  {
    "idCongelador": 5,
    "idDispositivo": 12,
    "nombreDispositivo": "Sensor principal congelador 5",
    "temperatura": -18.5,
    "ambiente": 22.1,
    "humedad": null,
    "timestamp": "2026-06-02T18:47:00.000Z"
  }
  ```
