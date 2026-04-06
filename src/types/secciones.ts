import { z } from "zod/v4";
import { SeccionSchema } from "../schemas/secciones.js";

// Tipos inferidos del schema
export type SeccionInput = z.infer<typeof SeccionSchema>;
export type SeccionInputParcial = Partial<SeccionInput>;

// Tipo de respuesta de la base de datos
export interface DispositivoResponse {
    id: number;
    nombre: string;
    data: { temperatura: number; ambiente: number; creado: Date }[];
    infoEstatus: { bateria: number; rssi: number; snr: number; creado: Date }[];
    temperaturaPromedio?: number | null;
    ambientePromedio?: number | null;
    ultimaLectura?: Date | null;
}

export interface CongeladorResponse {
    id: number;
    nombre: string;
    temperaturaObjetivo: number;
    dispositivos: DispositivoResponse[];
    // Campos calculados por el controlador
    temperaturaPromedio?: number | null;
    ambientePromedio?: number | null;
    ultimaLectura?: Date | null;
    dispositivosActivos?: number;
    dispositivosTotales?: number;
}

export interface SeccionResponse {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
    sucursal: {
        id: number;
        nombre: string;
    };
    congeladores?: CongeladorResponse[];
}
