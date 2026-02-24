import { z } from "zod/v4";
import { InfoEstatusSchema } from "../schemas/infoEstatus.js";

// Tipos inferidos del schema
export type InfoEstatusInput = z.infer<typeof InfoEstatusSchema>;
export type InfoEstatusInputParcial = Partial<InfoEstatusInput>;

// Tipo de respuesta de la base de datos
export interface InfoEstatusResponse {
    id: number;
    bateria: number;
    rssi: number;
    snr: number;
    estatus: boolean;
    creado: Date;
    gateway: {
        id: number;
        identificador: string;
    };
    dispositivo: {
        id: number;
        nombre: string;
    };
}
