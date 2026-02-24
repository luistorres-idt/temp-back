import { z } from "zod/v4";

export const ModuloSchema = z.object({
    nombre: z.string(),
    estatus: z.boolean().nullish(),
});

export const moduloSelect = {
    id: true,
    nombre: true,
    estatus: true,
    creado: true,
};

export const evaluarModulo = (data: unknown) => ModuloSchema.safeParse(data);
export const evaluarModuloParcial = (data: unknown) => ModuloSchema.partial().safeParse(data);
