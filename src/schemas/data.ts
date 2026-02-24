import { z } from "zod/v4";

export const DataSchema = z.object({
    temperatura: z.number(),
    ambiente: z.number(),
    idDispositivo: z.number().int(),
    estatus: z.boolean().nullish(),
});

export const dataSelect = {
    id: true,
    temperatura: true,
    ambiente: true,
    estatus: true,
    creado: true,
    dispositivo: { select: { id: true, nombre: true } },
};

export const evaluarData = (data: unknown) => DataSchema.safeParse(data);
export const evaluarDataParcial = (data: unknown) => DataSchema.partial().safeParse(data);
