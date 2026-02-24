import { z } from "zod/v4";
import { ClienteSchema } from "../schemas/clientes.js";

// Tipos inferidos del schema
export type ClienteInput = z.infer<typeof ClienteSchema>;
export type ClienteInputParcial = Partial<ClienteInput>;

// Tipo de respuesta de la base de datos
export interface ClienteResponse {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
}
