import { Response } from "express";
import { MENSAJE_ERROR, MENSAJE_EXITO } from "../utils/mensajes.js";
import { AppRequest } from "../types/types.js";
import type { BaseRepository } from "../models/BaseRepository.js";
import type { PrismaWhereInput } from "../types/base.js";

type ValidadorFn = (data: unknown) => { success: boolean; data?: unknown; error?: unknown };

export class BaseController {
    protected model: BaseRepository<unknown, Record<string, unknown>, Record<string, unknown>>;
    protected evaluarCreacion: ValidadorFn;
    protected evaluarEdicion: ValidadorFn;

    constructor({
        model,
        evaluarCreacion,
        evaluarEdicion,
    }: {
        model: BaseRepository<unknown, Record<string, unknown>, Record<string, unknown>>;
        evaluarCreacion: ValidadorFn;
        evaluarEdicion: ValidadorFn;
    }) {
        this.model = model;
        this.evaluarCreacion = evaluarCreacion;
        this.evaluarEdicion = evaluarEdicion;
    }

    obtenerElementos = async (req: AppRequest, res: Response): Promise<void> => {
        try {
            const { numElementos, elementos } = await this.model.obtenerElementos({
                skip: req.paginacion?.skip,
                take: req.paginacion?.take,
                where: req.where as PrismaWhereInput,
            });
            res.json({
                mensaje: MENSAJE_EXITO.LISTADO,
                data: elementos,
                resultados: numElementos,
            });
        } catch (err) {
            console.error(err);
            res.status(404).json({ error: MENSAJE_ERROR.LISTADO });
        }
    };

    crearElemento = async (req: AppRequest, res: Response): Promise<void> => {
        const result = this.evaluarCreacion(req.body);

        if (!result.success) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        try {
            const elemento = await this.model.crearElemento({ data: result.data as Record<string, unknown> });
            res.status(201).json({ mensaje: MENSAJE_EXITO.CREACION, data: elemento });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: MENSAJE_ERROR.CREACION });
        }
    };

    obtenerElemento = async (req: AppRequest, res: Response): Promise<void> => {
        const id = req.params.id as string;

        try {
            const elemento = await this.model.obtenerElemento({ id: parseInt(id) });
            res.json({ mensaje: MENSAJE_EXITO.LISTADO_UNO, data: elemento });
        } catch (err) {
            console.error(err);
            res.status(404).json({ error: MENSAJE_ERROR.LISTADO_UNO });
        }
    };

    editarElemento = async (req: AppRequest, res: Response): Promise<void> => {
        const id = req.params.id as string;
        const result = this.evaluarEdicion(req.body);

        if (!result.success) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        try {
            const elemento = await this.model.editarElemento({
                id: parseInt(id),
                data: result.data as Record<string, unknown>,
            });
            res.json({ mensaje: MENSAJE_EXITO.EDICION, data: elemento });
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: MENSAJE_ERROR.EDICION });
        }
    };
}
