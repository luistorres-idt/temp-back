import { z } from "zod/v4";
import { OperacionSchema } from "../schemas/operaciones.js";

// Tipos inferidos del schema
export type OperacionInput = z.infer<typeof OperacionSchema>;
export type OperacionInputParcial = Partial<OperacionInput>;

// Tipo de respuesta de la base de datos
export interface OperacionResponse {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
}
