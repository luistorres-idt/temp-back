import type { SocketEventPayload, EventHandler } from "../types/socket.js";

/**
 * EventObserver -- Nucleo del patron Observer.
 *
 * Singleton que permite suscribir handlers a eventos y notificarlos
 * cuando ocurren. Opera de forma independiente a Socket.IO: los handlers
 * registrados aqui son logica interna del servidor (logs, side-effects,
 * encadenamiento de acciones, etc.).
 *
 * @example
 * ```ts
 * const observer = EventObserver.getInstance();
 *
 * observer.subscribe("alerta:creada", (payload) => {
 *     console.log("Nueva alerta:", payload.data);
 * });
 *
 * observer.notify({ event: "alerta:creada", data: { id: 1 } });
 * ```
 */
export class EventObserver {
    private static instance: EventObserver;
    private readonly listeners: Map<string, Set<EventHandler>>;

    private constructor() {
        this.listeners = new Map();
    }

    /** Obtiene la instancia unica del EventObserver. */
    static getInstance(): EventObserver {
        if (!EventObserver.instance) {
            EventObserver.instance = new EventObserver();
        }
        return EventObserver.instance;
    }

    /**
     * Suscribe un handler a un evento especifico.
     *
     * @param event - Nombre del evento al cual suscribirse.
     * @param handler - Funcion que se ejecutara cuando el evento sea notificado.
     */
    subscribe(event: string, handler: EventHandler): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
    }

    /**
     * Elimina un handler previamente suscrito a un evento.
     *
     * @param event - Nombre del evento.
     * @param handler - Referencia exacta al handler que se desea eliminar.
     */
    unsubscribe(event: string, handler: EventHandler): void {
        const handlers = this.listeners.get(event);
        if (!handlers) return;

        handlers.delete(handler);

        if (handlers.size === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Notifica a todos los handlers suscritos al evento del payload.
     *
     * Los handlers se ejecutan de forma concurrente. Errores en handlers
     * individuales no interrumpen la ejecucion de los demas.
     *
     * @param payload - Datos del evento a notificar.
     */
    async notify(payload: SocketEventPayload): Promise<void> {
        const handlers = this.listeners.get(payload.event);
        if (!handlers || handlers.size === 0) return;

        const results = [...handlers].map(async (handler) => {
            try {
                await handler(payload);
            } catch (error) {
                console.error(
                    `[EventObserver] Error en handler del evento "${payload.event}":`,
                    error,
                );
            }
        });

        await Promise.allSettled(results);
    }

    /**
     * Verifica si un evento tiene handlers suscritos.
     *
     * @param event - Nombre del evento a verificar.
     * @returns `true` si hay al menos un handler suscrito.
     */
    hasSubscribers(event: string): boolean {
        return (this.listeners.get(event)?.size ?? 0) > 0;
    }

    /** Elimina todos los handlers de todos los eventos. Util para testing. */
    clear(): void {
        this.listeners.clear();
    }
}
