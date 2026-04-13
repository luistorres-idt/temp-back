/**
 * Tipos para el sistema de sockets y notificaciones en tiempo real.
 *
 * `SocketEventPayload` es la estructura unificada que se usa para emitir
 * y recibir eventos a traves de Socket.IO y del EventObserver interno.
 */

/** Nombres de eventos soportados por el sistema de notificaciones. */
export type SocketEventName =
    | "alerta:creada"
    | "alerta:actualizada"
    | "alerta:eliminada"
    | "notificacion:nueva"
    | "notificacion:leida"
    | "datos:actualizados"
    | (string & {});

/** Payload estandar para cualquier evento emitido por el sistema. */
export interface SocketEventPayload<T = unknown> {
    /** Nombre del evento. */
    event: SocketEventName;
    /** Datos asociados al evento. */
    data: T;
    /** Marca de tiempo ISO 8601. Se genera automaticamente si no se provee. */
    timestamp?: string;
    /** Room de Socket.IO al cual dirigir la emision. Omitir para broadcast. */
    room?: string;
    /** Namespace de Socket.IO (default: "/"). */
    namespace?: string;
}

/** Funcion que maneja un evento notificado por el EventObserver. */
export type EventHandler<T = unknown> = (payload: SocketEventPayload<T>) => void | Promise<void>;
