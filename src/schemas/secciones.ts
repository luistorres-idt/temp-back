import { z } from "zod/v4";

export const SeccionSchema = z.object({
    nombre: z.string(),
    idSucursal: z.number().int(),
    estatus: z.boolean().nullish(),
});

export const seccionSelect = {
    id: true,
    nombre: true,
    estatus: true,
    creado: true,
    sucursal: { select: { id: true, nombre: true, cliente: { select: { id: true, nombre: true } } } },
    congeladores: {
        where: { estatus: true },
        select: {
            id: true,
            nombre: true,
            temperaturaObjetivo: true,
            dispositivos: {
                where: { estatus: true },
                select: {
                    id: true,
                    nombre: true,
                    infoEstatus: { take: 1, orderBy: { creado: "desc" }, select: { id: true, bateria: true, rssi: true, snr: true, creado: true } },
                    data: {
                        take: 10,
                        orderBy: { creado: "desc" },
                        where: { creado: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                        select: { temperatura: true, ambiente: true, creado: true },
                    },
                },
            },
        },
    },
};

export const evaluarSeccion = (data: unknown) => SeccionSchema.safeParse(data);
export const evaluarSeccionParcial = (data: unknown) => SeccionSchema.partial().safeParse(data);
