import { z } from "zod/v4";

export const InfoEstatusSchema = z.object({
    bateria: z.number(),
    rssi: z.number().int(),
    snr: z.number().int(),
    idGateway: z.number().int(),
    idDispositivo: z.number().int(),
    estatus: z.boolean().nullish(),
});

export const infoEstatusSelect = {
    id: true,
    bateria: true,
    rssi: true,
    snr: true,
    estatus: true,
    creado: true,
    gateway: { select: { id: true, identificador: true } },
    dispositivo: { select: { id: true, nombre: true } },
};

export const evaluarInfoEstatus = (data: unknown) => InfoEstatusSchema.safeParse(data);
export const evaluarInfoEstatusParcial = (data: unknown) => InfoEstatusSchema.partial().safeParse(data);
