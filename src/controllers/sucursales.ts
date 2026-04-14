import { Response } from "express";
import { BaseController } from "./base.js";
import { evaluarSucursal, evaluarSucursalParcial } from "../schemas/sucursales.js";
import { SucursalModel } from "../models/sucursales.js";
import { AppRequest } from "../types/types.js";
import { MENSAJE_ERROR, MENSAJE_EXITO } from "../utils/mensajes.js";

export class SucursalesController extends BaseController {
    constructor() {
        super({
            model: SucursalModel,
            evaluarCreacion: evaluarSucursal,
            evaluarEdicion: evaluarSucursalParcial,
        });
    }

    // Override: fuerza idCliente del JWT, ignorando lo que envíe el body
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
