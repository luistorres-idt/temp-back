import { z } from "zod/v4";

export const AccionSchema = z.object({
    nombre: z.string(),
    moduloId: z.number().int(),
    operacionId: z.number().int(),
    estatus: z.boolean().nullish(),
});

export const accionSelect = {
    id: true,
    nombre: true,
    estatus: true,
    creado: true,
    modulo: { select: { id: true, nombre: true } },
    operacion: { select: { id: true, nombre: true } },
};

export const evaluarAccion = (data: unknown) => AccionSchema.safeParse(data);
export const evaluarAccionParcial = (data: unknown) => AccionSchema.partial().safeParse(data);
