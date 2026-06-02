import type { DomainEvent } from "../../../../shared/domain/DomainEvent.js";
import type { TelemetriaRecibidaData } from "../../domain/events/TelemetriaRecibida.js";
import { TELEMETRIA_RECIBIDA } from "../../domain/events/TelemetriaRecibida.js";
import { EventBus } from "../../../../shared/infrastructure/EventBus.js";
import { TelemetriaStreamController } from "../../infrastructure/http/TelemetriaStreamController.js";

/**
 * Event Handler: emite telemetria via Server-Sent Events (SSE) cuando se recibe
 * un evento de dominio TelemetriaRecibida.
 */
export class OnTelemetriaRecibida {
    constructor() { }

    /**
     * Registra este handler en el EventBus global.
     */
    registrar(): void {
        const bus = EventBus.getInstance();
        bus.subscribe(TELEMETRIA_RECIBIDA, this.handle as (event: DomainEvent) => void);
    }

    private handle = (event: DomainEvent<TelemetriaRecibidaData>): void => {
        const { data } = event;

        TelemetriaStreamController.enviarTelemetria({
            idCongelador: data.idCongelador,
            idDispositivo: data.idDispositivo,
            nombreDispositivo: data.nombreDispositivo,
            temperatura: data.temperatura,
            ambiente: data.ambiente,
            humedad: data.humedad,
            timestamp: data.timestamp,
            idSucursal: data.idSucursal,
        });
    };
}
