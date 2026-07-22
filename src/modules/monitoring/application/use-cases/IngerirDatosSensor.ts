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

        const temperaturasInvalidas = [655.35, 316.16, 0.13];
        const sensoresFiltrados = comando.sensores.filter(
            (sensor) => !temperaturasInvalidas.includes(sensor.data.temperatura)
        );

        // Obtener la temperatura ambiente una sola vez si algún sensor en el lote la necesita
        let ambienteComun = 0;
        const algunSensorNecesitaAmbiente = sensoresFiltrados.some(
            (sensor) => sensor.data.ambiente === undefined || sensor.data.ambiente === null
        );
        if (algunSensorNecesitaAmbiente) {
            ambienteComun = await this.resolverAmbiente();
        }

        // 2. Procesar sensores en transaccion en paralelo — sensores no registrados se omiten
        const procesados = await this.dataRepository.ejecutarEnTransaccion(async (txRepo) => {
            return Promise.all(
                sensoresFiltrados.map((sensor) =>
                    this.procesarSensor(txRepo, sensor, gateway.id, ambienteComun, comando.firmaGateway)
                )
            );
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

        // 4. Publicar eventos solo de los sensores guardados en segundo plano sin bloquear
        this.eventBus.publish(eventosAPublicar).catch((err) => {
            console.error("[EventBus] Error publicando eventos en background:", err);
        });

        return { guardados, noRegistrados };
    }

    private async procesarSensor(
        repo: IDataRepository,
        sensor: DatosSensor,
        idGateway: number,
        ambienteComun: number,
        firmaGateway?: string,
    ): Promise<ResultadoProcesamiento> {
        const dispositivo = await repo.buscarDispositivoPorIdentificadorYGateway(
            sensor.identificador,
            idGateway,
        );

        if (!dispositivo) {
            return { tipo: "no_registrado", identificador: sensor.identificador };
        }

        const ambiente = sensor.data.ambiente ?? ambienteComun;

        const resultado = await repo.persistirLectura({
            temperatura: sensor.data.temperatura,
            ambiente,
            humedad: sensor.data.humedad ?? null,
            idDispositivo: dispositivo.id,
            bateria: sensor.signal.bateria,
            rssi: sensor.signal.rssi,
            snr: sensor.signal.snr ?? 0,
            idGateway,
            firmaGateway,
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
