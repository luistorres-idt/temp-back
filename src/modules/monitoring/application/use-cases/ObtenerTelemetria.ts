import type { UseCase } from "../../../../shared/application/UseCase.js";
import type { ICongeladorRepository, ModoTelemetria, DatosTelemetria } from "../../domain/repositories.js";

/**
 * DTO de entrada para obtener telemetria de un congelador.
 */
export interface ObtenerTelemetriaDto {
    id: number;
    modo: ModoTelemetria;
    fechaInicio?: Date;
    fechaFin?: Date;
}

/**
 * Use Case: Obtener telemetria de un congelador.
 *
 * Delega la consulta al repositorio de congeladores.
 * Encapsula la validacion del modo y la obtencion de datos.
 */
export class ObtenerTelemetria implements UseCase<ObtenerTelemetriaDto, DatosTelemetria> {
    constructor(
        private readonly congeladorRepository: ICongeladorRepository,
    ) { }

    async execute(request: ObtenerTelemetriaDto): Promise<DatosTelemetria> {
        return this.congeladorRepository.obtenerTelemetria(request.id, request.modo, request.fechaInicio, request.fechaFin);
    }
}
