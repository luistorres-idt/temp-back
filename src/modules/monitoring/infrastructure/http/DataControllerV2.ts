import { Response } from "express";
import { AppRequest } from "../../../../types/types.js";
import { DomainError } from "../../../../shared/domain/DomainError.js";
import { MENSAJE_EXITO } from "../../../../utils/mensajes.js";
import { evaluarData } from "../../../../schemas/data.js";
import { IngerirDatosSensor } from "../../application/use-cases/IngerirDatosSensor.js";
import { PrismaDataRepository } from "../persistence/PrismaDataRepository.js";
import { EventBus } from "../../../../shared/infrastructure/EventBus.js";

/**
 * Controller DDD para ingesta de datos IoT.
 *
 * Responsabilidad UNICA: traducir HTTP <-> Use Case.
 * Toda la logica de negocio vive en IngerirDatosSensor.
 *
 * Comparacion con el controller anterior:
 * - Antes: ~130 lineas con transacciones Prisma, queries, WebSocket emission
 * - Ahora: ~30 lineas de traduccion HTTP
 */
export class DataControllerV2 {
    private readonly ingerirDatosSensor: IngerirDatosSensor;

    constructor() {
        this.ingerirDatosSensor = new IngerirDatosSensor(
            new PrismaDataRepository(),
            EventBus.getInstance(),
        );
    }

    crearElemento = async (req: AppRequest, res: Response): Promise<void> => {
        const result = evaluarData(req.body);

        if (!result.success) {
            res.status(400).json({ error: "Los datos proporcionados no son validos" });
            return;
        }

        try {
            const { identificador, data: sensores } = result.data;

            const resultados = await this.ingerirDatosSensor.execute({
                identificadorGateway: identificador,
                sensores,
            });

            res.status(201).json({
                mensaje: MENSAJE_EXITO.CREACION,
                data: resultados,
            });
        } catch (err) {
            if (DomainError.isDomainError(err)) {
                res.status(err.httpStatus).json({ error: err.message });
                return;
            }
            console.error(err);
            const mensaje = err instanceof Error ? err.message : "Error al crear el registro";
            res.status(400).json({ error: mensaje });
        }
    };
}
