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

            const activos = dispositivos.filter(d => d.data && d.data.length > 0);
            congelador.dispositivosActivos = activos.length;

            if (activos.length > 0) {
                const temps     = activos.map(d => d.data[0].temperatura);
                const ambientes = activos.map(d => d.data[0].ambiente);

                congelador.temperaturaPromedio = mediana(temps);
                congelador.ambientePromedio    = mediana(ambientes);

                let fechaMasReciente: Date | null = null;
                activos.forEach((d) => {
                    const creado = d.data[0].creado;
                    if (!fechaMasReciente || creado > fechaMasReciente) {
                        fechaMasReciente = creado;
                    }
                });
                congelador.ultimaLectura = fechaMasReciente;
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
            const elemento = await this.model.obtenerElemento({
                id: parseInt(id),
                where: req.where as PrismaWhereInput,
            }) as SeccionResponse;
            const dataConPromedios = this.inyectarPromedios(elemento);

            res.json({ mensaje: MENSAJE_EXITO.LISTADO_UNO, data: dataConPromedios });
        } catch (err) {
            console.error(err);
            res.status(404).json({ error: MENSAJE_ERROR.LISTADO_UNO });
        }
    };

    // Override: fuerza idSucursal del JWT al crear
    crearElemento = async (req: AppRequest, res: Response): Promise<void> => {
        const result = this.evaluarCreacion(req.body);

        if (!result.success) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        try {
            const data = result.data as Record<string, unknown>;
            this.inyectarTenant(req, data);

            const elemento = await this.model.crearElemento({ data });
            res.status(201).json({ mensaje: MENSAJE_EXITO.CREACION, data: elemento });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: MENSAJE_ERROR.CREACION });
        }
    };
}

function mediana(valores: number[]): number {
    const sorted = [...valores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const val = sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    return Number(val.toFixed(1));
}
