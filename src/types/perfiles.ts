import { z } from "zod/v4";
import { PerfilSchema } from "../schemas/perfiles.js";

// Tipos inferidos del schema
export type PerfilInput = z.infer<typeof PerfilSchema>;
export type PerfilInputParcial = Partial<PerfilInput>;

// Tipo de respuesta de la base de datos
export interface PerfilResponse {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
}
