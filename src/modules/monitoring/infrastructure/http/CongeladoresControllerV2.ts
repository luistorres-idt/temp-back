import { Response } from "express";
import { AppRequest } from "../../../../types/types.js";
import { DomainError } from "../../../../shared/domain/DomainError.js";
import { ObtenerTelemetria } from "../../application/use-cases/ObtenerTelemetria.js";
import { PrismaCongeladorRepository } from "../persistence/PrismaCongeladorRepository.js";
import type { ModoTelemetria } from "../../domain/repositories.js";

const MODOS_VALIDOS: ModoTelemetria[] = ["vivo", "historico"];

const esModoValido = (valor: unknown): valor is ModoTelemetria =>
    MODOS_VALIDOS.includes(valor as ModoTelemetria);

/**
 * Controller DDD para telemetria de congeladores.
 *
 * Solo se encarga de la ruta GET /api/congeladores/:id/telemetria.
 * La logica esta en ObtenerTelemetria use case.
 */
export class CongeladoresControllerV2 {
    private readonly obtenerTelemetriaUC: ObtenerTelemetria;

    constructor() {
        this.obtenerTelemetriaUC = new ObtenerTelemetria(
            new PrismaCongeladorRepository(),
        );
    }

    obtenerTelemetria = async (req: AppRequest, res: Response): Promise<void> => {
        const id = parseInt(req.params.id as string);

        if (isNaN(id)) {
            res.status(400).json({ error: "El ID del congelador debe ser un numero entero valido" });
            return;
        }

        const modo = req.query.modo ?? "vivo";

        if (!esModoValido(modo)) {
            res.status(400).json({
                error: `El modo '${modo}' no es valido. Use: ${MODOS_VALIDOS.join(" | ")}`,
            });
            return;
        }

        let fechaInicio: Date | undefined;
        let fechaFin: Date | undefined;

        if (modo === "historico") {
            if (req.query.fechaInicio) {
                fechaInicio = new Date(req.query.fechaInicio as string);
                if (isNaN(fechaInicio.getTime())) {
                    res.status(400).json({ error: "fechaInicio invalida" });
                    return;
                }
            }
            if (req.query.fechaFin) {
                fechaFin = new Date(req.query.fechaFin as string);
                if (isNaN(fechaFin.getTime())) {
                    res.status(400).json({ error: "fechaFin invalida" });
                    return;
                }
            }
        }

        try {
            const telemetria = await this.obtenerTelemetriaUC.execute({ id, modo, fechaInicio, fechaFin });
            res.json(telemetria);
        } catch (err) {
            if (DomainError.isDomainError(err)) {
                res.status(err.httpStatus).json({ error: err.message });
                return;
            }
            console.error("[CongeladoresControllerV2.obtenerTelemetria]", err);
            res.status(500).json({ error: "Error interno al obtener la telemetria del congelador" });
        }
    };
}
