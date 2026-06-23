import { Response } from "express";
import { AppRequest } from "../types/types.js";
import { PermisoModel } from "../models/permisos.js";

export class PermisosController {
    obtenerPermisosPerfil = async (req: AppRequest, res: Response): Promise<void> => {
        try {
            const permisos = await PermisoModel.obtenerElementos(req.where || {});

            res.json({
                mensaje: "Permisos cargados correctamente",
                data: permisos
            });
        } catch (err) {
            console.error("Error al obtener permisos:", err);
            res.status(500).json({ error: "Error al obtener permisos" });
        }
    };

    guardarPermisosPerfil = async (req: AppRequest, res: Response): Promise<void> => {
        const { idPerfil, idAcciones } = req.body;

        try {
            if (!idPerfil) {
                res.status(400).json({ error: "El ID del perfil es requerido" });
                return;
            }

            const idPerfilNum = parseInt(idPerfil, 10);
            if (isNaN(idPerfilNum)) {
                res.status(400).json({ error: "ID de perfil no válido" });
                return;
            }

            if (!Array.isArray(idAcciones)) {
                res.status(400).json({ error: "idAcciones debe ser un arreglo de números" });
                return;
            }

            await PermisoModel.crearElementos(idPerfilNum, idAcciones);

            res.json({
                mensaje: "Permisos actualizados correctamente"
            });
        } catch (err) {
            console.error("Error al guardar permisos:", err);
            res.status(500).json({ error: "Error al guardar permisos" });
        }
    };
}
