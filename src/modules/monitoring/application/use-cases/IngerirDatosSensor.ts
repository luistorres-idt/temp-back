import type { UseCase } from "../../../../shared/application/UseCase.js";
import type { DomainEvent } from "../../../../shared/domain/DomainEvent.js";
import { DomainError, EntityNotFoundError } from "../../../../shared/domain/DomainError.js";
import { EventBus } from "../../../../shared/infrastructure/EventBus.js";
import { telemetriaRecibida } from "../../domain/events/TelemetriaRecibida.js";
import type {
    IDataRepository,
    ComandoIngesta,
    DatosSensor,
    ResultadoIngesta,
} from "../../domain/repositories.js";

/**
 * DTO de respuesta de la ingesta.
 */
export interface IngestaResponseDto {
    data: object;
    infoEstatus: object;
}

/**
 * Use Case: Ingerir datos de sensores IoT.
 *
 * Orquesta todo el flujo de ingesta que antes vivia en DataController.crearElemento():
 * 1. Buscar el gateway por identificador.
 * 2. Para cada sensor: buscar dispositivo, crear Data e InfoEstatus.
 * 3. Publicar eventos de dominio (TelemetriaRecibida) para que los handlers
 *    reactivos emitan via WebSocket, generen alertas, etc.
 *
 * El controller solo traduce HTTP <-> UseCase y devuelve la respuesta.
 */
export class IngerirDatosSensor implements UseCase<ComandoIngesta, IngestaResponseDto[]> {
    constructor(
        private readonly dataRepository: IDataRepository,
        private readonly eventBus: EventBus,
    ) { }

    async execute(comando: ComandoIngesta): Promise<IngestaResponseDto[]> {
        // 1. Buscar gateway
        const gateway = await this.dataRepository.buscarGatewayPorIdentificador(
            comando.identificadorGateway,
        );

        if (!gateway) {
            throw new EntityNotFoundError("Gateway", comando.identificadorGateway);
        }

        // 2. Procesar sensores en transaccion
        const eventosAPublicar: DomainEvent[] = [];

        const resultados = await this.dataRepository.ejecutarEnTransaccion(async (txRepo) => {
            const registros: IngestaResponseDto[] = [];

            for (const sensor of comando.sensores) {
                const { resultado, eventos } = await this.procesarSensor(
                    txRepo,
                    sensor,
                    gateway.id,
                );
                registros.push(resultado);
                eventosAPublicar.push(...eventos);
            }

            return registros;
        });

        // 3. Publicar eventos (fuera de la transaccion)
        await this.eventBus.publish(eventosAPublicar);

        return resultados;
    }

    private async procesarSensor(
        repo: IDataRepository,
        sensor: DatosSensor,
        idGateway: number,
    ): Promise<{ resultado: IngestaResponseDto; eventos: DomainEvent[] }> {
        // Buscar dispositivo
        const dispositivo = await repo.buscarDispositivoPorNombreYGateway(
            sensor.identificador,
            idGateway,
        );

        if (!dispositivo) {
            throw new DomainError(
                "DISPOSITIVO_NO_ENCONTRADO",
                `Dispositivo '${sensor.identificador}' no encontrado para el gateway`,
                404,
            );
        }

        // Persistir lectura
        const resultado = await repo.persistirLectura({
            temperatura: sensor.data.temperatura,
            ambiente: sensor.data.ambiente,
            idDispositivo: dispositivo.id,
            bateria: sensor.signal.bateria,
            rssi: sensor.signal.rssi,
            snr: sensor.signal.snr,
            idGateway,
        });

        // Crear evento de dominio
        const evento = telemetriaRecibida({
            idCongelador: dispositivo.idCongelador,
            idDispositivo: dispositivo.id,
            nombreDispositivo: dispositivo.nombre,
            temperatura: sensor.data.temperatura,
            ambiente: sensor.data.ambiente,
            idSucursal: dispositivo.congelador.seccion.sucursal.id,
            timestamp: resultado.data.creado?.toISOString() ?? new Date().toISOString(),
        });

        return {
            resultado: { data: resultado.data, infoEstatus: resultado.infoEstatus },
            eventos: [evento],
        };
    }
}
