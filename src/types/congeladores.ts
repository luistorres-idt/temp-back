import { z } from "zod/v4";
import { CongeladorSchema } from "../schemas/congeladores.js";

// Tipos inferidos del schema
export type CongeladorInput = z.infer<typeof CongeladorSchema>;
export type CongeladorInputParcial = Partial<CongeladorInput>;

// Tipo de respuesta de la base de datos
export interface CongeladorResponse {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
    seccion: {
        id: number;
        nombre: string;
    };
}
