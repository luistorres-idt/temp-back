import { z } from "zod/v4";
import { AccionSchema } from "../schemas/acciones.js";

// Tipos inferidos del schema
export type AccionInput = z.infer<typeof AccionSchema>;
export type AccionInputParcial = Partial<AccionInput>;

// Tipo de respuesta de la base de datos
export interface AccionResponse {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
    modulo: {
        id: number;
        nombre: string;
    };
    operacion: {
        id: number;
        nombre: string;
    };
}
