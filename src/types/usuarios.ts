import { z } from "zod/v4";
import { UsuarioSchema } from "../schemas/usuarios.js";

// Tipos inferidos del schema
export type UsuarioInput = z.infer<typeof UsuarioSchema>;
export type UsuarioInputParcial = Partial<UsuarioInput>;

// Tipo de respuesta de la base de datos
export interface UsuarioResponse {
    id: number;
    nombre: string;
    apellido: string;
    correo: string;
    estatus: boolean;
    creado: Date;
    perfil: {
        id: number;
        nombre: string;
    };
    cliente: {
        id: number;
        nombre: string;
    } | null;
    sucursal: {
        id: number;
        nombre: string;
    } | null;
}
