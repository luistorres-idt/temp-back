import { z } from "zod/v4";
import { ModuloSchema } from "../schemas/modulos.js";

// Tipos inferidos del schema
export type ModuloInput = z.infer<typeof ModuloSchema>;
export type ModuloInputParcial = Partial<ModuloInput>;

// Tipo de respuesta de la base de datos
export interface ModuloResponse {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
}
