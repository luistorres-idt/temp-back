import { BaseController } from "./base.js";
import { evaluarData, evaluarDataParcial } from "../schemas/data.js";
import { DataModel } from "../models/data.js";
import { prisma } from "../config/db.js";
import { AppRequest } from "../types/types.js";
import { Response } from "express";
import { MENSAJE_ERROR, MENSAJE_EXITO } from "../utils/mensajes.js";

export class DataController extends BaseController {
    constructor() {
        super({
            model: DataModel,
            evaluarCreacion: evaluarData,
            evaluarEdicion: evaluarDataParcial,
        });
    }

    //override para el metodo crearElemento
    crearElemento = async (req: AppRequest, res: Response): Promise<void> => {
        const result = evaluarData(req.body);

        if (!result.success) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        const { identificador: idGateway, data: sensores } = result.data;

        try {
            // buscar el gateway por su identificador
            const gateway = await prisma.gateway.findFirst({
                where: { identificador: idGateway, estatus: true },
                select: { id: true },
            });

            if (!gateway) {
                res.status(404).json({ error: `Gateway con identificador '${idGateway}' no encontrado` });
                return;
            }

            // procesar cada sensor dentro de una transaccion
            const resultados = await prisma.$transaction(async (tx) => {
                const registros: { data: object; infoEstatus: object }[] = [];

                for (const sensor of sensores) {
                    // buscar el dispositivo por nombre (identificador del sensor) y gateway
                    const dispositivo = await tx.dispositivo.findFirst({
                        where: {
                            nombre: sensor.identificador,
                            idGateway: gateway.id,
                            estatus: true,
                        },
                        select: { id: true },
                    });

                    if (!dispositivo) {
                        throw new Error(
                            `Dispositivo '${sensor.identificador}' no encontrado para el gateway '${idGateway}'`,
                        );
                    }

                    // crear registro de Data (temperatura y ambiente)
                    const dataRegistro = await tx.data.create({
                        data: {
                            temperatura: sensor.data.temperatura,
                            ambiente: sensor.data.ambiente,
                            idDispositivo: dispositivo.id,
                        },
                    });

                    // crear registro de InfoEstatus (signal del sensor)
                    const infoEstatusRegistro = await tx.infoEstatus.create({
                        data: {
                            bateria: sensor.signal.bateria,
                            rssi: sensor.signal.rssi,
                            snr: sensor.signal.snr,
                            idGateway: gateway.id,
                            idDispositivo: dispositivo.id,
                        },
                    });

                    registros.push({
                        data: dataRegistro,
                        infoEstatus: infoEstatusRegistro,
                    });
                }

                return registros;
            });

            res.status(201).json({
                mensaje: MENSAJE_EXITO.CREACION,
                data: resultados,
            });
        } catch (err) {
            console.error(err);
            const mensaje = err instanceof Error ? err.message : MENSAJE_ERROR.CREACION;
            res.status(400).json({ error: mensaje });
        }
    };
}
