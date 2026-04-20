import { createDomainEvent } from "../../../../shared/domain/DomainEvent.js";
import type { DomainEvent } from "../../../../shared/domain/DomainEvent.js";

/**
 * Datos del evento TelemetriaRecibida.
 */
export interface TelemetriaRecibidaData {
    idCongelador: number | null;
    idDispositivo: number;
    nombreDispositivo: string;
    temperatura: number;
    ambiente: number;
    idSucursal: number;
    timestamp: string;
}

/**
 * Evento de dominio emitido cuando se recibe una nueva lectura de telemetria.
 * Los handlers pueden reaccionar para: emitir WebSocket, generar alertas, etc.
 */
export const TELEMETRIA_RECIBIDA = "telemetria.recibida";

export function telemetriaRecibida(data: TelemetriaRecibidaData): DomainEvent<TelemetriaRecibidaData> {
    return createDomainEvent(TELEMETRIA_RECIBIDA, data);
}
