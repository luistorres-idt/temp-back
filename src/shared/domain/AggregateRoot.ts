import { Entity } from "./Entity.js";
import type { DomainEvent } from "./DomainEvent.js";

/**
 * Clase base para Aggregate Roots.
 *
 * Un Aggregate Root es una entidad que actua como punto de entrada
 * consistente a un cluster de objetos de dominio. Ademas, acumula
 * eventos de dominio que seran despachados despues de persistir.
 *
 * Los eventos se acumulan con `addDomainEvent()` y se extraen con
 * `pullDomainEvents()` (que limpia la lista, evitando re-emision).
 *
 * @template TId - Tipo del identificador.
 *
 * @example
 * ```ts
 * class Congelador extends AggregateRoot<number> {
 *     registrarLectura(lectura: Lectura): void {
 *         // ... logica de negocio
 *         this.addDomainEvent(createDomainEvent("telemetria.recibida", { ... }));
 *     }
 * }
 * ```
 */
export abstract class AggregateRoot<TId = number> extends Entity<TId> {
    private _domainEvents: DomainEvent[] = [];

    /**
     * Registra un evento de dominio para despacho posterior.
     */
    protected addDomainEvent(event: DomainEvent): void {
        this._domainEvents.push(event);
    }

    /**
     * Extrae y limpia todos los eventos de dominio acumulados.
     * Debe llamarse despues de persistir el aggregate para
     * despachar los eventos al bus.
     */
    pullDomainEvents(): DomainEvent[] {
        const events = [...this._domainEvents];
        this._domainEvents = [];
        return events;
    }

    /**
     * Numero de eventos pendientes de despacho.
     */
    get domainEventsCount(): number {
        return this._domainEvents.length;
    }
}
