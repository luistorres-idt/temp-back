import { prisma } from "../config/db.js";

export const PermisoModel = {
    async obtenerPermisos(where: object) {
        return prisma.permiso.findMany({
            where,
            select: {
                id: true,
                idAccion: true,
                idPerfil: true
            }
        });
    },

    async guardarPermisos(idPerfil: number, idAcciones: number[]) {
        return prisma.$transaction(async (tx) => {
            // Eliminar permisos existentes para el perfil
            await tx.permiso.deleteMany({
                where: { idPerfil }
            });

            if (idAcciones.length > 0) {
                const dataToCreate = idAcciones.map((idAccion: number) => ({
                    idPerfil,
                    idAccion
                }));

                await tx.permiso.createMany({
                    data: dataToCreate
                });
            }
        });
    }
};
