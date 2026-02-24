import { z } from "zod/v4";

export const ClienteSchema = z.object({
    nombre: z.string(),
    estatus: z.boolean().nullish(),
});

export const clienteSelect = {
    id: true,
    nombre: true,
    estatus: true,
    creado: true,
};

export const evaluarCliente = (data: unknown) => ClienteSchema.safeParse(data);
export const evaluarClienteParcial = (data: unknown) => ClienteSchema.partial().safeParse(data);
