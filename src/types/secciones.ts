import { z } from "zod/v4";
import { SeccionSchema } from "../schemas/secciones.js";

// Tipos inferidos del schema
export type SeccionInput = z.infer<typeof SeccionSchema>;
export type SeccionInputParcial = Partial<SeccionInput>;

// Tipo de respuesta de la base de datos
export interface SeccionResponse {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
    sucursal: {
        id: number;
        nombre: string;
    };
}
