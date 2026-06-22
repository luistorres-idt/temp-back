import { Response } from "express";
import { AppRequest } from "../types/types.js";
import { prisma } from "../config/db.js";

export class PermisosController {
    obtenerPermisosPerfil = async (req: AppRequest, res: Response): Promise<void> => {
        const idPerfilStr = req.query.idPerfil as string;

        try {
            if (!idPerfilStr) {
                res.status(400).json({ error: "El ID del perfil es requerido" });
                return;
            }

            const idPerfil = parseInt(idPerfilStr, 10);
            if (isNaN(idPerfil)) {
                res.status(400).json({ error: "ID de perfil no válido" });
                return;
            }

            const permisos = await prisma.permiso.findMany({
                where: { idPerfil, estatus: true },
                select: {
                    id: true,
                    idAccion: true,
                    idPerfil: true
                }
            });

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

            // Transacción para borrar y re-crear los permisos
            await prisma.$transaction(async (tx) => {
                // Eliminar permisos existentes para el perfil
                await tx.permiso.deleteMany({
                    where: { idPerfil: idPerfilNum }
                });

                if (idAcciones.length > 0) {
                    const dataToCreate = idAcciones.map((idAccion: number) => ({
                        idPerfil: idPerfilNum,
                        idAccion
                    }));

                    await tx.permiso.createMany({
                        data: dataToCreate
                    });
                }
            });

            res.json({
                mensaje: "Permisos actualizados correctamente"
            });
        } catch (err) {
            console.error("Error al guardar permisos:", err);
            res.status(500).json({ error: "Error al guardar permisos" });
        }
    };
}
