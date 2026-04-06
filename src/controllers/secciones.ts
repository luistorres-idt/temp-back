import { Response } from "express";
import { AppRequest } from "../types/types.js";
import { MENSAJE_ERROR, MENSAJE_EXITO } from "../utils/mensajes.js";
import { BaseController } from "./base.js";
import { evaluarSeccion, evaluarSeccionParcial } from "../schemas/secciones.js";
import { SeccionModel } from "../models/secciones.js";
import type { PrismaWhereInput } from "../types/base.js";
import type { SeccionResponse } from "../types/secciones.js";

export class SeccionesController extends BaseController {
    constructor() {
        super({
            model: SeccionModel,
            evaluarCreacion: evaluarSeccion,
            evaluarEdicion: evaluarSeccionParcial,
        });
    }

    private inyectarPromedios = (seccion: SeccionResponse): SeccionResponse => {
        if (!seccion.congeladores) return seccion;

        seccion.congeladores.forEach((congelador) => {
            const dispositivos = congelador.dispositivos ?? [];
            congelador.dispositivosTotales = dispositivos.length;

            // Dispositivos activos = los que tienen datos en las ultimas 24h
            const activos = dispositivos.filter(d => d.data && d.data.length > 0);
            congelador.dispositivosActivos = activos.length;

            if (activos.length > 0) {
                // Promedio global: todos los registros de todos los dispositivos activos
                let sumTemp = 0;
                let sumAmbiente = 0;
                let totalRegistros = 0;
                let fechaMasReciente: Date | null = null;

                activos.forEach((dispositivo) => {
                    dispositivo.data.forEach((d) => {
                        sumTemp += d.temperatura;
                        sumAmbiente += d.ambiente;
                        totalRegistros++;
                    });
                    // Conservar la lectura mas reciente entre todos los dispositivos
                    const primeraFecha = dispositivo.data[0].creado;
                    if (!fechaMasReciente || primeraFecha > fechaMasReciente) {
                        fechaMasReciente = primeraFecha;
                    }
                });

                congelador.temperaturaPromedio = Number((sumTemp / totalRegistros).toFixed(1));
                congelador.ambientePromedio    = Number((sumAmbiente / totalRegistros).toFixed(1));
                congelador.ultimaLectura       = fechaMasReciente;
            } else {
                congelador.temperaturaPromedio = null;
                congelador.ambientePromedio    = null;
                congelador.ultimaLectura       = null;
            }
        });

        return seccion;
    };


    override obtenerElementos = async (req: AppRequest, res: Response): Promise<void> => {
        try {
            const { numElementos, elementos } = await this.model.obtenerElementos({
                skip: req.paginacion?.skip,
                take: req.paginacion?.take,
                where: req.where as PrismaWhereInput,
            });

            const dataConPromedios = (elementos as SeccionResponse[]).map(this.inyectarPromedios);

            res.json({
                mensaje: MENSAJE_EXITO.LISTADO,
                data: dataConPromedios,
                resultados: numElementos,
            });
        } catch (err) {
            console.error(err);
            res.status(404).json({ error: MENSAJE_ERROR.LISTADO });
        }
    };

    override obtenerElemento = async (req: AppRequest, res: Response): Promise<void> => {
        const id = req.params.id as string;

        try {
            const elemento = await this.model.obtenerElemento({ id: parseInt(id) }) as SeccionResponse;
            const dataConPromedios = this.inyectarPromedios(elemento);
            
            res.json({ mensaje: MENSAJE_EXITO.LISTADO_UNO, data: dataConPromedios });
        } catch (err) {
            console.error(err);
            res.status(404).json({ error: MENSAJE_ERROR.LISTADO_UNO });
        }
    };
}
