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
    sucursal: { select: { id: true, nombre: true } },
};

export const evaluarSeccion = (data: unknown) => SeccionSchema.safeParse(data);
export const evaluarSeccionParcial = (data: unknown) => SeccionSchema.partial().safeParse(data);
