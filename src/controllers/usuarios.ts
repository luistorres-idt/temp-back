import { Response } from "express";
import { BaseController } from "./base.js";
import { evaluarUsuario, evaluarUsuarioParcial } from "../schemas/usuarios.js";
import { UsuarioModel } from "../models/usuarios.js";
import { hashPassword } from "../utils/password.js";
import { MENSAJE_ERROR, MENSAJE_EXITO } from "../utils/mensajes.js";
import { AppRequest } from "../types/types.js";

export class UsuariosController extends BaseController {
    constructor() {
        super({
            model: UsuarioModel,
            evaluarCreacion: evaluarUsuario,
            evaluarEdicion: evaluarUsuarioParcial,
        });
    }

    // Override para hashear el password al crear
    crearElemento = async (req: AppRequest, res: Response): Promise<void> => {
        const result = this.evaluarCreacion(req.body);

        if (!result.success) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        try {
            const data = result.data as Record<string, unknown>;
            if (data.password) {
                data.password = await hashPassword(data.password as string);
            }

            const elemento = await this.model.crearElemento({ data });
            res.status(201).json({ mensaje: MENSAJE_EXITO.CREACION, data: elemento });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: MENSAJE_ERROR.CREACION });
        }
    };

    // Override para hashear el password al editar
    editarElemento = async (req: AppRequest, res: Response): Promise<void> => {
        const id = req.params.id as string;
        const result = this.evaluarEdicion(req.body);

        if (!result.success) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        try {
            const data = result.data as Record<string, unknown>;
            if (data.password) {
                data.password = await hashPassword(data.password as string);
            }

            const elemento = await this.model.editarElemento({
                id: parseInt(id),
                data,
                where: req.where as Record<string, unknown>,
            });
            res.json({ mensaje: MENSAJE_EXITO.EDICION, data: elemento });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: MENSAJE_ERROR.EDICION });
        }
    };
}
