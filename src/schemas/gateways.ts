import { z } from "zod/v4";

export const GatewaySchema = z.object({
    identificador: z.string(),
    nombre: z.string(),
    idSeccion: z.number().int(),
    estatus: z.boolean().nullish(),
});

export const gatewaySelect = {
    id: true,
    identificador: true,
    nombre: true,
    estatus: true,
    creado: true,
    seccion: {
        select: {
            id: true,
            nombre: true,
            sucursal: {
                select: { id: true, nombre: true, cliente: { select: { id: true, nombre: true } } }
            }
        }
    },
};

export const evaluarGateway = (data: unknown) => GatewaySchema.safeParse(data);
export const evaluarGatewayParcial = (data: unknown) => GatewaySchema.partial().safeParse(data);
