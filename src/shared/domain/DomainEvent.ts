/**
 * Interfaz base para todos los eventos de dominio.
 *
 * Un evento de dominio representa algo que ocurrio en el dominio
 * que puede ser de interes para otras partes del sistema.
 *
 * Convencion de nombres: sustantivo en pasado (TelemetriaRecibida, UsuarioCreado).
 */
export interface DomainEvent<T = unknown> {
    /** Nombre unico del evento. Ej: "telemetria.recibida" */
    readonly eventName: string;

    /** Instante en que ocurrio el evento (ISO 8601). */
    readonly occurredOn: string;

    /** Datos asociados al evento. */
    readonly data: T;
}

/**
 * Crea un DomainEvent con timestamp automatico.
 */
export function createDomainEvent<T>(eventName: string, data: T): DomainEvent<T> {
    return {
        eventName,
        occurredOn: new Date().toISOString(),
        data,
    };
}
