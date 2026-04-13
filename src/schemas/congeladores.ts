import { z } from "zod/v4";

export const CongeladorSchema = z.object({
    nombre: z.string(),
    idSeccion: z.number().int(),
    temperaturaObjetivo: z.number().optional(),
    estatus: z.boolean().nullish(),
});

export const congeladorSelect = {
    id: true,
    nombre: true,
    temperaturaObjetivo: true,
    estatus: true,
    creado: true,
    seccion: { select: { id: true, nombre: true } },
};

/**
 * Select para el endpoint de telemetria del congelador.
 * Incluye los dispositivos con sus ultimas lecturas.
 */
export const congeladorDetalleSelect = {
    id: true,
    nombre: true,
    temperaturaObjetivo: true,
    seccion: { select: { id: true, nombre: true, sucursal: { select: { id: true, nombre: true } } } },
    dispositivos: {
        where: { estatus: true },
        select: {
            id: true,
            nombre: true,
        },
    },
};

export const evaluarCongelador = (data: unknown) => CongeladorSchema.safeParse(data);
export const evaluarCongeladorParcial = (data: unknown) => CongeladorSchema.partial().safeParse(data);
