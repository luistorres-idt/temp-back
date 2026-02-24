import { z } from "zod/v4";
import { DataSchema } from "../schemas/data.js";

// Tipos inferidos del schema
export type DataInput = z.infer<typeof DataSchema>;
export type DataInputParcial = Partial<DataInput>;

// Tipo de respuesta de la base de datos
export interface DataResponse {
    id: number;
    temperatura: number;
    ambiente: number;
    estatus: boolean;
    creado: Date;
    dispositivo: {
        id: number;
        nombre: string;
    };
}
