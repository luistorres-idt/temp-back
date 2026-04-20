import type { DomainEvent } from "../../../../shared/domain/DomainEvent.js";
import type { TelemetriaRecibidaData } from "../../domain/events/TelemetriaRecibida.js";
import { TELEMETRIA_RECIBIDA } from "../../domain/events/TelemetriaRecibida.js";
import { EventBus } from "../../../../shared/infrastructure/EventBus.js";
import type { Server as SocketIOServer } from "socket.io";

/**
 * Event Handler: emite telemetria via WebSocket cuando se recibe
 * un evento de dominio TelemetriaRecibida.
 *
 * Reemplaza la emision directa de `io.to(room).emit(...)` que
 * vivia dentro de DataController.crearElemento.
 *
 * Beneficio: si se necesita agregar otra reaccion ante nueva telemetria
 * (email, alerta, log), se agrega otro handler sin tocar IngerirDatosSensor.
 */
export class OnTelemetriaRecibida {
    constructor(private readonly io: SocketIOServer) { }

    /**
     * Registra este handler en el EventBus global.
     */
    registrar(): void {
        const bus = EventBus.getInstance();
        bus.subscribe(TELEMETRIA_RECIBIDA, this.handle as (event: DomainEvent) => void);
    }

    private handle = (event: DomainEvent<TelemetriaRecibidaData>): void => {
        const { data } = event;
        const room = `sucursal:${data.idSucursal}`;

        this.io.to(room).emit("telemetria:nueva", {
            idCongelador: data.idCongelador,
            idDispositivo: data.idDispositivo,
            nombreDispositivo: data.nombreDispositivo,
            temperatura: data.temperatura,
            ambiente: data.ambiente,
            timestamp: data.timestamp,
        });

        console.log("Emitiendo evento telemetria:nueva");
    }
}
