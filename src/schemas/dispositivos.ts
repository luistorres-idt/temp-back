import { z } from "zod/v4";

export const DispositivoSchema = z.object({
    nombre: z.string(),
    idGateway: z.number().int(),
    idCongelador: z.number().int(),
    estatus: z.boolean().nullish(),
});

export const dispositivoSelect = {
    id: true,
    nombre: true,
    estatus: true,
    creado: true,
    gateway: { select: { id: true, identificador: true } },
    congelador: { select: { id: true, nombre: true } },
};

export const evaluarDispositivo = (data: unknown) => DispositivoSchema.safeParse(data);
export const evaluarDispositivoParcial = (data: unknown) => DispositivoSchema.partial().safeParse(data);
