import { Request } from "express";
import { Gateway } from "../generated/prisma/index.js";

export interface UsuarioToken {
    id: number;
    nombre: string;
    correo: string;
    perfil: {
        id: number;
        nombre: string;
        acciones: Record<string, string[]>;
    };
    cliente?: { id: number };
    sucursal?: { id: number };
}

// Usamos intersección en lugar de extends para evitar conflicto con Request.take
export type AppRequest = Request & {
    usuario?: UsuarioToken;
    gateway?: Gateway;
    firmaGateway?: string;
    where?: Record<string, unknown>;
    paginacion?: {
        take?: number;
        skip?: number;
    };
};
