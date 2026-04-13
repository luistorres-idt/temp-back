import { z } from "zod/v4";
import { CongeladorSchema } from "../schemas/congeladores.js";

// Tipos inferidos del schema
export type CongeladorInput = z.infer<typeof CongeladorSchema>;
export type CongeladorInputParcial = Partial<CongeladorInput>;

// Tipo de respuesta de la base de datos
export interface CongeladorResponse {
    id: number;
    nombre: string;
    temperaturaObjetivo: number;
    estatus: boolean;
    creado: Date;
    seccion: {
        id: number;
        nombre: string;
    };
}

// Tipos de telemetria
export type ModoTelemetria = "vivo" | "historico";

export interface LecturaDispositivo {
    temperatura: number;
    ambiente: number;
    creado: Date;
}

export interface DispositivoConLecturas {
    id: number;
    nombre: string;
    lecturas: LecturaDispositivo[];
}

export interface TelemetriaResponse {
    congelador: {
        id: number;
        nombre: string;
        temperaturaObjetivo: number;
        seccion: {
            id: number;
            nombre: string;
            sucursal: { id: number; nombre: string };
        };
    };
    dispositivos: DispositivoConLecturas[];
    modo: ModoTelemetria;
}
