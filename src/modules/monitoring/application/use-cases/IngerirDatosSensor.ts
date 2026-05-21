import type { UseCase } from "../../../../shared/application/UseCase.js";
import type { DomainEvent } from "../../../../shared/domain/DomainEvent.js";
import { EntityNotFoundError } from "../../../../shared/domain/DomainError.js";
import { EventBus } from "../../../../shared/infrastructure/EventBus.js";
import { telemetriaRecibida } from "../../domain/events/TelemetriaRecibida.js";
import type { IAmbienteProvider } from "../../domain/ports/IAmbienteProvider.js";
import type {
    IDataRepository,
    ComandoIngesta,
    DatosSensor,
} from "../../domain/repositories.js";

export interface IngestaItemDto {
    data: object;
    infoEstatus: object;
}

export interface IngestaResponseDto {
    guardados: IngestaItemDto[];
    noRegistrados: string[];
}

type ResultadoProcesamiento =
    | { tipo: "exito"; resultado: IngestaItemDto; eventos: DomainEvent[] }
    | { tipo: "no_registrado"; identificador: string };

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
export class IngerirDatosSensor implements UseCase<ComandoIngesta, IngestaResponseDto> {
    constructor(
        private readonly dataRepository: IDataRepository,
        private readonly eventBus: EventBus,
        private readonly ambienteProvider?: IAmbienteProvider,
    ) { }

    async execute(comando: ComandoIngesta): Promise<IngestaResponseDto> {
        // 1. Buscar gateway
        const gateway = await this.dataRepository.buscarGatewayPorIdentificador(
            comando.identificadorGateway,
        );

        if (!gateway) {
            throw new EntityNotFoundError("Gateway", comando.identificadorGateway);
        }

        // 2. Procesar sensores en transaccion — sensores no registrados se omiten
        const procesados = await this.dataRepository.ejecutarEnTransaccion(async (txRepo) => {
            const resultados: ResultadoProcesamiento[] = [];

            for (const sensor of comando.sensores) {
                resultados.push(await this.procesarSensor(txRepo, sensor, gateway.id));
            }

            return resultados;
        });

        // 3. Separar exitosos de no registrados
        const guardados: IngestaItemDto[] = [];
        const noRegistrados: string[] = [];
        const eventosAPublicar: DomainEvent[] = [];

        for (const p of procesados) {
            if (p.tipo === "exito") {
                guardados.push(p.resultado);
                eventosAPublicar.push(...p.eventos);
            } else {
                noRegistrados.push(p.identificador);
            }
        }

        // 4. Publicar eventos solo de los sensores guardados
        await this.eventBus.publish(eventosAPublicar);

        return { guardados, noRegistrados };
    }

    private async procesarSensor(
        repo: IDataRepository,
        sensor: DatosSensor,
        idGateway: number,
    ): Promise<ResultadoProcesamiento> {
        const dispositivo = await repo.buscarDispositivoPorIdentificadorYGateway(
            sensor.identificador,
            idGateway,
        );

        if (!dispositivo) {
            return { tipo: "no_registrado", identificador: sensor.identificador };
        }

        const ambiente = sensor.data.ambiente ?? await this.resolverAmbiente();

        const resultado = await repo.persistirLectura({
            temperatura: sensor.data.temperatura,
            ambiente,
            humedad: sensor.data.humedad ?? null,
            idDispositivo: dispositivo.id,
            bateria: sensor.signal.bateria,
            rssi: sensor.signal.rssi,
            snr: sensor.signal.snr ?? 0,
            idGateway,
        });

        const evento = telemetriaRecibida({
            idCongelador: dispositivo.idCongelador,
            idDispositivo: dispositivo.id,
            nombreDispositivo: dispositivo.nombre,
            temperatura: sensor.data.temperatura,
            ambiente,
            humedad: sensor.data.humedad ?? null,
            idSucursal: dispositivo.congelador.seccion.sucursal.id,
            timestamp: resultado.data.creado?.toISOString() ?? new Date().toISOString(),
        });

        return {
            tipo: "exito",
            resultado: { data: resultado.data, infoEstatus: resultado.infoEstatus },
            eventos: [evento],
        };
    }

    private async resolverAmbiente(): Promise<number> {
        if (!this.ambienteProvider) return 0;
        return this.ambienteProvider.obtenerAmbiente();
    }
}
