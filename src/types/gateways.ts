import { z } from "zod/v4";
import { GatewaySchema } from "../schemas/gateways.js";

// Tipos inferidos del schema
export type GatewayInput = z.infer<typeof GatewaySchema>;
export type GatewayInputParcial = Partial<GatewayInput>;

// Tipo de respuesta de la base de datos
export interface GatewayResponse {
    id: number;
    identificador: string;
    nombre: string;
    estatus: boolean;
    tokenHash?: string | null;
    publicKeyPem?: string | null;
    creado: Date;
    seccion: {
        id: number;
        nombre: string;
    };
}
