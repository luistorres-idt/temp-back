import { z } from "zod/v4";

export const DataSchema = z.object({
    identificador: z.string(),//identificador del gateway
    data: z.array(
        z.object({
            identificador: z.string(),//identificador del sensor
            signal: z.object({
                bateria: z.number(),
                rssi: z.number(),
                snr: z.number().nullish(),
            }),
            data: z.object({
                temperatura: z.number(),
                ambiente: z.number().nullish(),
                humedad: z.number().nullish(),
            }),
        })
    ),
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
