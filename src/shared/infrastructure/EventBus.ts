import type { DomainEvent } from "../domain/DomainEvent.js";

/**
 * Handler de evento de dominio.
 * Recibe el evento y ejecuta logica reactiva (side-effects).
 */
export type DomainEventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;

/**
 * EventBus -- Bus de eventos de dominio.
 *
 * Singleton que permite registrar handlers para eventos de dominio
 * y publicarlos. Reemplaza y extiende al EventObserver existente
 * para trabajar con DomainEvent en lugar de SocketEventPayload.
 *
 * El EventBus es independiente de Socket.IO. La emision a clientes
 * WebSocket se realiza mediante handlers suscritos al bus, no
 * directamente desde los use cases.
 *
 * @example
 * ```ts
 * const bus = EventBus.getInstance();
 *
 * // Registrar handler
 * bus.subscribe("telemetria.recibida", async (event) => {
 *     console.log("Nueva telemetria:", event.data);
 * });
 *
 * // Publicar eventos (tipicamente despues de persistir el aggregate)
 * const events = aggregate.pullDomainEvents();
 * await bus.publish(events);
 * ```
 */
export class EventBus {
    private static instance: EventBus;
    private readonly handlers: Map<string, Set<DomainEventHandler>>;

    private constructor() {
        this.handlers = new Map();
    }

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /**
     * Suscribe un handler a un tipo de evento de dominio.
     *
     * @param eventName - Nombre del evento (ej: "telemetria.recibida").
     * @param handler - Funcion a ejecutar cuando ocurra el evento.
     */
    subscribe(eventName: string, handler: DomainEventHandler): void {
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, new Set());
        }
        this.handlers.get(eventName)!.add(handler);
    }

    /**
     * Elimina un handler previamente suscrito.
     */
    unsubscribe(eventName: string, handler: DomainEventHandler): void {
        const set = this.handlers.get(eventName);
        if (!set) return;
        set.delete(handler);
        if (set.size === 0) this.handlers.delete(eventName);
    }

    /**
     * Publica un conjunto de eventos de dominio.
     * Los handlers se ejecutan concurrentemente; fallos individuales
     * no interrumpen a los demas.
     *
     * @param events - Lista de eventos a publicar (tipicamente de `aggregate.pullDomainEvents()`).
     */
    async publish(events: DomainEvent[]): Promise<void> {
        for (const event of events) {
            const set = this.handlers.get(event.eventName);
            if (!set || set.size === 0) continue;

            const results = [...set].map(async (handler) => {
                try {
                    await handler(event);
                } catch (error) {
                    console.error(
                        `[EventBus] Error en handler del evento "${event.eventName}":`,
                        error,
                    );
                }
            });

            await Promise.allSettled(results);
        }
    }

    /**
     * Verifica si un evento tiene handlers suscritos.
     */
    hasSubscribers(eventName: string): boolean {
        return (this.handlers.get(eventName)?.size ?? 0) > 0;
    }

    /** Limpia todos los handlers. Util para testing. */
    clear(): void {
        this.handlers.clear();
    }
}
