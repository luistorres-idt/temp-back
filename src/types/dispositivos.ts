import { z } from "zod/v4";
import { DispositivoSchema } from "../schemas/dispositivos.js";

// Tipos inferidos del schema
export type DispositivoInput = z.infer<typeof DispositivoSchema>;
export type DispositivoInputParcial = Partial<DispositivoInput>;

// Tipo de respuesta de la base de datos
export interface DispositivoResponse {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
    gateway: {
        id: number;
        identificador: string;
    };
    congelador: {
        id: number;
        nombre: string;
    };
}
