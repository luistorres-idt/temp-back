import { z } from "zod/v4";
import { SucursalSchema } from "../schemas/sucursales.js";

// Tipos inferidos del schema
export type SucursalInput = z.infer<typeof SucursalSchema>;
export type SucursalInputParcial = Partial<SucursalInput>;

// Tipo de respuesta de la base de datos
export interface SucursalResponse {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
    cliente: {
        id: number;
        nombre: string;
    };
}
