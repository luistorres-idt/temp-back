import type { Server as SocketIOServer } from "socket.io";
import type { SocketEventPayload } from "../types/socket.js";
import { EventObserver } from "./event-observer.js";

/**
 * NotificationEmitter -- Fachada unica para emitir eventos en tiempo real.
 *
 * Centraliza toda la logica de emision en un solo metodo `emit()` que:
 * 1. Resuelve el namespace destino (default: "/").
 * 2. Resuelve el room destino (si existe, emite a ese room; si no, broadcast).
 * 3. Emite via Socket.IO a los clientes conectados.
 * 4. Notifica al EventObserver para ejecutar handlers internos del servidor.
 *
 * @example
 * ```ts
 * const emitter = NotificationEmitter.getInstance();
 *
 * // Broadcast a todos los clientes en el namespace por defecto
 * emitter.emit({ event: "alerta:creada", data: { id: 1 } });
 *
 * // Emitir a un room especifico
 * emitter.emit({ event: "datos:actualizados", data: { id: 5 }, room: "sucursal-3" });
 *
 * // Emitir a un namespace especifico
 * emitter.emit({ event: "notificacion:nueva", data: { msg: "Hola" }, namespace: "/admin" });
 *
 * // Emitir a un room dentro de un namespace
 * emitter.emit({
 *     event: "alerta:creada",
 *     data: { nivel: "critico" },
 *     namespace: "/alertas",
 *     room: "cliente-10",
 * });
 * ```
 */
export class NotificationEmitter {
    private static instance: NotificationEmitter;
    private io: SocketIOServer | null = null;
    private readonly observer: EventObserver;

    private constructor() {
        this.observer = EventObserver.getInstance();
    }

    /** Obtiene la instancia unica del NotificationEmitter. */
    static getInstance(): NotificationEmitter {
        if (!NotificationEmitter.instance) {
            NotificationEmitter.instance = new NotificationEmitter();
        }
        return NotificationEmitter.instance;
    }

    /**
     * Inyecta la instancia de Socket.IO Server.
     * Debe llamarse una sola vez durante la inicializacion del servidor.
     *
     * @param io - Instancia de Socket.IO Server.
     */
    initialize(io: SocketIOServer): void {
        if (this.io) {
            console.warn("[NotificationEmitter] Ya fue inicializado. Se reemplaza la instancia de io.");
        }
        this.io = io;
    }

    /**
     * Emite un evento a los clientes conectados via Socket.IO y notifica
     * a los handlers internos del EventObserver.
     *
     * Este es el unico punto de emision del sistema. Toda emision de
     * eventos en tiempo real debe pasar por este metodo.
     *
     * @param payload - Datos del evento a emitir.
     * @param payload.event - Nombre del evento.
     * @param payload.data - Datos asociados.
     * @param payload.namespace - Namespace destino (default: "/").
     * @param payload.room - Room destino. Si se omite, se hace broadcast.
     * @param payload.timestamp - Se genera automaticamente si no se provee.
     */
    async emit<T = unknown>(payload: SocketEventPayload<T>): Promise<void> {
        const enrichedPayload: SocketEventPayload<T> = {
            ...payload,
            timestamp: payload.timestamp ?? new Date().toISOString(),
        };

        this.emitViaSocketIO(enrichedPayload);
        await this.observer.notify(enrichedPayload as SocketEventPayload);
    }

    /**
     * Resuelve namespace y room, y emite por Socket.IO.
     */
    private emitViaSocketIO<T>(payload: SocketEventPayload<T>): void {
        if (!this.io) {
            console.warn(
                `[NotificationEmitter] Socket.IO no inicializado. Evento "${payload.event}" solo fue procesado por el Observer.`,
            );
            return;
        }

        const { event, namespace = "/", room, timestamp, ...rest } = payload;
        const emitData = { ...rest.data as object, timestamp };
        const target = this.io.of(namespace);

        if (room) {
            target.to(room).emit(event, emitData);
        } else {
            target.emit(event, emitData);
        }
    }

    /** Verifica si el emitter fue inicializado con una instancia de Socket.IO. */
    get isInitialized(): boolean {
        return this.io !== null;
    }
}
