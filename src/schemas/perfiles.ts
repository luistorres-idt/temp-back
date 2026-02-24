import { z } from "zod/v4";

export const PerfilSchema = z.object({
    nombre: z.string(),
    estatus: z.boolean().nullish(),
});

export const perfilSelect = {
    id: true,
    nombre: true,
    estatus: true,
    creado: true,
};

export const evaluarPerfil = (data: unknown) => PerfilSchema.safeParse(data);
export const evaluarPerfilParcial = (data: unknown) => PerfilSchema.partial().safeParse(data);
