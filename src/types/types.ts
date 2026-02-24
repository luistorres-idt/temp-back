import { Request } from "express";

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
    where?: Record<string, unknown>;
    paginacion?: {
        take?: number;
        skip?: number;
    };
};
