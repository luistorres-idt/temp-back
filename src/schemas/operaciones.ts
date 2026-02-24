import { z } from "zod/v4";

export const OperacionSchema = z.object({
    nombre: z.string(),
    estatus: z.boolean().nullish(),
});

export const operacionSelect = {
    id: true,
    nombre: true,
    estatus: true,
    creado: true,
};

export const evaluarOperacion = (data: unknown) => OperacionSchema.safeParse(data);
export const evaluarOperacionParcial = (data: unknown) => OperacionSchema.partial().safeParse(data);
