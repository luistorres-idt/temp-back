import { BaseController } from "./base.js";
import { evaluarCongelador, evaluarCongeladorParcial } from "../schemas/congeladores.js";
import { CongeladorModel } from "../models/congeladores.js";
import { AppRequest } from "../types/types.js";
import { Response } from "express";
import type { ModoTelemetria } from "../types/congeladores.js";

const MODOS_VALIDOS: ModoTelemetria[] = ["vivo", "historico"];

const esModoValido = (valor: unknown): valor is ModoTelemetria =>
    MODOS_VALIDOS.includes(valor as ModoTelemetria);

export class CongeladoresController extends BaseController {
    constructor() {
        super({
            model: CongeladorModel,
            evaluarCreacion: evaluarCongelador,
            evaluarEdicion: evaluarCongeladorParcial,
        });
    }

    /**
     * GET /api/congeladores/:id/telemetria?modo=vivo|historico
     *
     * Devuelve las lecturas de todos los dispositivos del congelador,
     * agrupadas por sensor, segun el modo solicitado.
     */
    obtenerTelemetria = async (req: AppRequest, res: Response): Promise<void> => {
        const id = parseInt(req.params.id as string);

        if (isNaN(id)) {
            res.status(400).json({ error: "El ID del congelador debe ser un numero entero valido" });
            return;
        }

        const modo = req.query.modo ?? "vivo";

        if (!esModoValido(modo)) {
            res.status(400).json({ error: `El modo '${modo}' no es valido. Use: ${MODOS_VALIDOS.join(" | ")}` });
            return;
        }

        try {
            const telemetria = await CongeladorModel.obtenerTelemetria(id, modo);
            res.json(telemetria);
        } catch (err) {
            if (err instanceof Error && err.message === "CONGELADOR_NO_ENCONTRADO") {
                res.status(404).json({ error: "Congelador no encontrado o inactivo" });
                return;
            }
            console.error("[CongeladoresController.obtenerTelemetria]", err);
            res.status(500).json({ error: "Error interno al obtener la telemetria del congelador" });
        }
    };
}
