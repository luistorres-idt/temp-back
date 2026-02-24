import { z } from "zod/v4";

export const GatewaySchema = z.object({
    identificador: z.string(),
    idSeccion: z.number().int(),
    estatus: z.boolean().nullish(),
});

export const gatewaySelect = {
    id: true,
    identificador: true,
    estatus: true,
    creado: true,
    seccion: { select: { id: true, nombre: true } },
};

export const evaluarGateway = (data: unknown) => GatewaySchema.safeParse(data);
export const evaluarGatewayParcial = (data: unknown) => GatewaySchema.partial().safeParse(data);
