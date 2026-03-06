# Documentacion de Sockets (Notificaciones en Tiempo Real)

Sistema de notificaciones en tiempo real implementado con **Socket.IO** y el **patron Observer**. Permite emitir y suscribirse a eventos desde cualquier parte del backend usando un unico metodo centralizado.

---

## Arquitectura

```
Controller / Service
       |
       v
NotificationEmitter.emit(payload)
       |
       +---> Socket.IO (namespace/room) --> Clientes conectados
       |
       +---> EventObserver.notify(payload) --> Handlers internos del servidor
```

**Componentes principales:**

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `EventObserver` | `src/sockets/event-observer.ts` | Patron Observer (Singleton). Registra y ejecuta handlers internos del servidor cuando ocurren eventos. |
| `NotificationEmitter` | `src/sockets/notification-emitter.ts` | Fachada (Singleton). Unico punto de emision: envia a Socket.IO y notifica al Observer. |
| `initializeSocketServer` | `src/sockets/server.ts` | Configuracion e inicializacion del servidor Socket.IO. |
| Tipos | `src/types/socket.ts` | Tipos TypeScript para eventos, payloads y handlers. |

---

## Conexion desde el Cliente

### Dependencia

```bash
pnpm add socket.io-client
```

### Conexion basica

```typescript
import { io } from "socket.io-client";

// Namespace por defecto
const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log("Conectado:", socket.id);
});

// Escuchar un evento
socket.on("alerta:creada", (data) => {
    console.log("Nueva alerta:", data);
});
```

### Conexion a un namespace especifico

```typescript
const alertasSocket = io("http://localhost:3000/alertas");

alertasSocket.on("alerta:creada", (data) => {
    console.log("Alerta recibida en /alertas:", data);
});
```

### Unirse a un room (desde el servidor)

Los rooms se asignan desde el backend. El cliente no se une directamente a un room; el servidor lo agrega cuando corresponda:

```typescript
// Ejemplo en el servidor (futuro)
socket.join("sucursal-3");
```

---

## Emision de Eventos (Backend)

### Metodo unico: `NotificationEmitter.emit(payload)`

Toda emision de eventos pasa por este metodo. Acepta un `SocketEventPayload`:

```typescript
interface SocketEventPayload<T = unknown> {
    event: SocketEventName;  // Nombre del evento
    data: T;                 // Datos del evento
    timestamp?: string;      // ISO 8601 (se genera automaticamente)
    room?: string;           // Room destino (omitir = broadcast)
    namespace?: string;      // Namespace destino (default: "/")
}
```

### Ejemplos de uso

```typescript
import { NotificationEmitter } from "../sockets/index.js";

const emitter = NotificationEmitter.getInstance();
```

**Broadcast a todos los clientes (namespace default):**

```typescript
emitter.emit({
    event: "alerta:creada",
    data: { id: 1, tipo: "temperatura", nivel: "alto" },
});
```

**Emitir a un room especifico:**

```typescript
emitter.emit({
    event: "datos:actualizados",
    data: { sensorId: 42, valor: 25.3 },
    room: "sucursal-3",
});
```

**Emitir a un namespace especifico:**

```typescript
emitter.emit({
    event: "notificacion:nueva",
    data: { mensaje: "Mantenimiento programado" },
    namespace: "/admin",
});
```

**Emitir a un room dentro de un namespace:**

```typescript
emitter.emit({
    event: "alerta:creada",
    data: { nivel: "critico", descripcion: "Temperatura fuera de rango" },
    namespace: "/alertas",
    room: "cliente-10",
});
```

---

## Suscripcion a Eventos (Backend - Observer)

El `EventObserver` permite registrar handlers internos que se ejecutan cuando un evento es emitido. Estos son independientes de Socket.IO y sirven para logica del servidor (logs, envio de correos, encadenamiento de acciones, etc.).

```typescript
import { EventObserver } from "../sockets/index.js";

const observer = EventObserver.getInstance();

// Suscribir un handler
observer.subscribe("alerta:creada", (payload) => {
    console.log("Se creo una alerta:", payload.data);
    // Guardar log, enviar correo, disparar otra accion...
});

// Eliminar un handler
const miHandler = (payload) => { /* ... */ };
observer.subscribe("alerta:creada", miHandler);
observer.unsubscribe("alerta:creada", miHandler);

// Verificar si hay suscriptores
observer.hasSubscribers("alerta:creada"); // true | false
```

---

## Eventos Disponibles

| Evento | Descripcion | Estado |
|---|---|---|
| `alerta:creada` | Se creo una nueva alerta | Pendiente de implementar |
| `alerta:actualizada` | Se actualizo una alerta existente | Pendiente de implementar |
| `alerta:eliminada` | Se elimino una alerta | Pendiente de implementar |
| `notificacion:nueva` | Nueva notificacion para el usuario | Pendiente de implementar |
| `notificacion:leida` | Una notificacion fue marcada como leida | Pendiente de implementar |
| `datos:actualizados` | Datos de sensores actualizados | Pendiente de implementar |

> Los nombres de eventos son extensibles. Se pueden agregar nuevos eventos al tipo `SocketEventName` en `src/types/socket.ts`.

---

## Estructura de Archivos

```
src/
  sockets/
    index.ts                 # Barrel export
    event-observer.ts        # Patron Observer (Singleton)
    notification-emitter.ts  # Fachada de emision (Singleton)
    server.ts                # Inicializacion de Socket.IO
  types/
    socket.ts                # Tipos para el sistema de sockets
```

---

## Integracion con app.ts

El servidor HTTP se creo con `http.createServer(app)` para que Express y Socket.IO compartan el mismo puerto. La inicializacion ocurre en `src/app.ts`:

```typescript
import { createServer } from "node:http";
import { initializeSocketServer, NotificationEmitter } from "./sockets/index.js";

const httpServer = createServer(app);
const io = initializeSocketServer(httpServer);
NotificationEmitter.getInstance().initialize(io);

httpServer.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```

---

## CORS

La configuracion de CORS para Socket.IO se encuentra en `src/sockets/server.ts`. Actualmente acepta todas las conexiones (`origin: "*"`). Ajustar en produccion segun sea necesario.
