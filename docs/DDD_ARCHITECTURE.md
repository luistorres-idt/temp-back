# Arquitectura DDD (Domain-Driven Design) en el Módulo de Monitoreo

Este documento describe la estructura arquitectónica basada en **Diseño Guiado por el Dominio (DDD)** y **Arquitectura Hexagonal (Puertos y Adaptadores)** aplicada en el contexto delimitado (Bounded Context) de **Monitoreo** (`backend/src/modules/monitoring`).

---

## 1. Capas de la Arquitectura

El módulo de monitoreo está organizado en tres capas principales con dependencias estrictas hacia adentro (las capas externas dependen de las internas, pero las internas no conocen nada de las externas):

```
+-------------------------------------------------------------------------+
|                              INFRAESTRUCTURA                            |
|  (DataControllerV2, PrismaCongeladorRepository, Express, Prisma, SSE)   |
|                                     |                                   |
|       +-----------------------------v-----------------------------+     |
|       |                         APLICACIÓN                        |     |
|       |  (IngerirDatosSensor, ObtenerTelemetria, EventHandlers)   |     |
|       |                             |                             |     |
|       |       +---------------------v---------------------+       |     |
|       |       |                   DOMINIO                 |       |     |
|       |       |   (TelemetriaRecibida, IDataRepository)   |       |     |
|       |       +-------------------------------------------+       |     |
|       +-----------------------------------------------------------+     |
+-------------------------------------------------------------------------+
```

### Capa de Dominio (`domain`)
Es el núcleo de la aplicación. Contiene el modelo de negocio, las reglas empresariales, los tipos fundamentales, las interfaces de persistencia (puertos) y los eventos de dominio. No tiene dependencias de librerías de terceros, bases de datos o frameworks web (Express).

* **Modelos y Repositorios:** Define las interfaces de comportamiento de los datos en [repositories.ts](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/domain/repositories.ts) (por ejemplo, la interfaz `IDataRepository`).
* **Puertos de Integración:** Define integraciones abstractas en [IAmbienteProvider.ts](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/domain/ports/IAmbienteProvider.ts).
* **Eventos de Dominio:** Elementos que notifican cambios significativos del negocio, como [TelemetriaRecibida.ts](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/domain/events/TelemetriaRecibida.ts).

### Capa de Aplicación (`application`)
Orquesta el flujo de control del negocio. Traduce los comandos del mundo exterior en operaciones del dominio. Implementa el patrón **Use Case** y define los manejadores de eventos (**Event Handlers**).

* **Casos de Uso:** Clases puras de lógica orquestadora, como [IngerirDatosSensor](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/application/use-cases/IngerirDatosSensor.ts) y [ObtenerTelemetria](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/application/use-cases/ObtenerTelemetria.ts).
* **Event Handlers:** Reacciones automáticas secundarias a los eventos de dominio, como [OnTelemetriaRecibida](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/application/event-handlers/OnTelemetriaRecibida.ts) encargada de redirigir los datos a la transmisión en vivo por SSE.

### Capa de Infraestructura (`infrastructure`)
Contiene los detalles técnicos e implementaciones concretas: bases de datos (Prisma), enrutamiento HTTP (Express Controllers), adaptadores de integración externa y controladores de transmisión (Server-Sent Events).

* **Controladores HTTP:** Traducen las peticiones HTTP y delegan la ejecución al caso de uso correspondiente, como [DataControllerV2](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/infrastructure/http/DataControllerV2.ts).
* **Adaptadores de Persistencia:** Implementan las interfaces de dominio usando una tecnología específica, como [PrismaCongeladorRepository.ts](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/infrastructure/persistence/PrismaCongeladorRepository.ts) utilizando Prisma Client.
* **Transmisión de Eventos:** Transmite datos al cliente, como el controlador [TelemetriaStreamController](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/infrastructure/http/TelemetriaStreamController.ts) que maneja las conexiones SSE.

---

## 2. Patrones Clave Aplicados

### A. Puertos y Adaptadores (Arquitectura Hexagonal)
En lugar de que la lógica de aplicación dependa directamente de Prisma, el caso de uso depende de la interfaz `IDataRepository` (un **Puerto**). La implementación de Prisma (`PrismaDataRepository`) es un **Adaptador** inyectado en tiempo de ejecución.

> [!NOTE]
> Esto significa que si en el futuro decidimos migrar de MySQL (Prisma) a MongoDB o DynamoDB, la lógica de negocio en [IngerirDatosSensor](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/application/use-cases/IngerirDatosSensor.ts) permanecerá 100% inalterada. Solo necesitaremos programar un nuevo adaptador que implemente la interfaz `IDataRepository`.

### B. Eventos de Dominio y EventBus
Cuando el caso de uso [IngerirDatosSensor](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/application/use-cases/IngerirDatosSensor.ts) completa con éxito la transacción de almacenamiento de la telemetría, publica un evento de dominio `TELEMETRIA_RECIBIDA` a través del [EventBus](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/shared/infrastructure/EventBus.ts).

De forma completamente desacoplada:
* El handler [OnTelemetriaRecibida](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/application/event-handlers/OnTelemetriaRecibida.ts) reacciona enviando la información por Server-Sent Events.
* Otros posibles handlers (por ejemplo, para generar alertas críticas o enviar correos por temperaturas anómalas) pueden suscribirse al mismo evento sin alterar una sola línea del caso de uso de ingesta principal.

---

## 3. ¿Por qué es recomendable esta Arquitectura?

### 1. Testabilidad Excepcional
Al separar la infraestructura del dominio, podemos realizar pruebas unitarias del comportamiento de la aplicación de manera muy sencilla, inyectando mocks de los repositorios y servicios externos sin necesidad de conectarse a una base de datos real.
* Véase la suite de pruebas unitarias en [IngerirDatosSensor.test.ts](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/__tests__/unit/use-cases/IngerirDatosSensor.test.ts) que valida todo el flujo simulando llamadas de base de datos a través de repositorios mockeados en memoria.

### 2. Desacoplamiento Tecnológico (Mantenibilidad)
Durante la reciente migración de **WebSockets (Socket.IO)** a **Server-Sent Events (SSE)**, la lógica empresarial del caso de uso [IngerirDatosSensor](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/application/use-cases/IngerirDatosSensor.ts) **no requirió cambios**. 
El único cambio técnico necesario fue actualizar el suscriptor del evento en [OnTelemetriaRecibida](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/src/modules/monitoring/application/event-handlers/OnTelemetriaRecibida.ts) para enviar datos a través del `TelemetriaStreamController` en lugar de emitir por WebSocket.

### 3. Código Expresivo (Lenguaje Ubicuo)
Los nombres de las carpetas, clases y métodos reflejan directamente la terminología utilizada por el equipo del negocio (por ejemplo, `congelador`, `sensor`, `telemetria`, `ingesta`, `alerta`) en lugar de términos puramente técnicos (`postData`, `saveRow`, `webSocketEmit`). Esto reduce la brecha cognitiva entre el desarrollo y el negocio.
