import { z } from "zod/v4";

export const ClienteSchema = z.object({
    nombre: z.string(),
    estatus: z.boolean().nullish(),
    horaReporte: z.number().int().min(0).max(23).optional(),
});

export const clienteSelect = {
    id: true,
    nombre: true,
    horaReporte: true,
    estatus: true,
    creado: true,
};

export const evaluarCliente = (data: unknown) => ClienteSchema.safeParse(data);
export const evaluarClienteParcial = (data: unknown) => ClienteSchema.partial().safeParse(data);
