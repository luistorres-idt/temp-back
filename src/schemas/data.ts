import { z } from "zod/v4";

export const DataSchema = z.object({
    identificador: z.string(),//identificador del gateway
    data: z.array(
        z.object({
            identificador: z.string(),//identificador del sensor
            signal: z.object({
                bateria: z.number(),
                rssi: z.number(),
                snr: z.number(),
            }),
            data: z.object({
                temperatura: z.number(),
                ambiente: z.number(),
                humedad: z.number().optional(),
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
