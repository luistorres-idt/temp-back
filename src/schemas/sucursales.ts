import { z } from "zod/v4";

export const SucursalSchema = z.object({
    nombre: z.string(),
    idCliente: z.number().int(),
    estatus: z.boolean().nullish(),
});

export const sucursalSelect = {
    id: true,
    nombre: true,
    estatus: true,
    creado: true,
    cliente: { select: { id: true, nombre: true } },
};

export const evaluarSucursal = (data: unknown) => SucursalSchema.safeParse(data);
export const evaluarSucursalParcial = (data: unknown) => SucursalSchema.partial().safeParse(data);
