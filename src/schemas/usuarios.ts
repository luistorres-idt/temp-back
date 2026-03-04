import { z } from "zod/v4";

export const UsuarioSchema = z.object({
    nombre: z.string(),
    apellido: z.string(),
    correo: z.string().email(),
    password: z.string(),
    idPerfil: z.number().int(),
    idCliente: z.number().int().nullish(),
    idSucursal: z.number().int().nullish(),
    estatus: z.boolean().nullish(),
});

export const usuarioSelect = {
    id: true,
    nombre: true,
    apellido: true,
    correo: true,
    estatus: true,
    creado: true,
    perfil: { select: { id: true, nombre: true } },
    cliente: { select: { id: true, nombre: true } },
    sucursal: { select: { id: true, nombre: true } },
};

export const evaluarUsuario = (data: unknown) => UsuarioSchema.safeParse(data);
export const evaluarUsuarioParcial = (data: unknown) => UsuarioSchema.partial().safeParse(data);

// Schema para login
export const LoginSchema = z.object({
    correo: z.string().email(),
    password: z.string(),
});

export const evaluarLogin = (data: unknown) => LoginSchema.safeParse(data);
