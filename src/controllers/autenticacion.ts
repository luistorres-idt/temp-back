import { Request, Response } from "express";
import { evaluarLogin } from "../schemas/usuarios.js";
import { UsuarioModel } from "../models/usuarios.js";
import { compararPassword } from "../utils/password.js";
import { generarToken } from "../utils/token.js";
import { MENSAJE_ERROR, MENSAJE_EXITO } from "../utils/mensajes.js";
import { TOKEN_ACCESS_TIME, TOKEN_REFRESH_TIME } from "../config/settings.js";

export class AutenticacionController {
    static login = async (req: Request, res: Response): Promise<void> => {
        const result = evaluarLogin(req.body);

        if (!result.success) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        try {
            const { correo, password } = result.data;
            const usuario = await UsuarioModel.obtenerPorCorreo({ correo });

            if (!usuario) {
                res.status(401).json({ error: MENSAJE_ERROR.CREDENCIALES });
                return;
            }

            const passwordValido = await compararPassword(password, usuario.password);

            if (!passwordValido) {
                res.status(401).json({ error: MENSAJE_ERROR.CREDENCIALES });
                return;
            }

            // Mapear permisos del perfil
            const acciones: Record<string, string[]> = {};
            if (usuario.perfil?.permisos) {
                for (const permiso of usuario.perfil.permisos) {
                    const modulo = permiso.accion.modulo.nombre;
                    const operacion = permiso.accion.operacion.nombre;
                    if (!acciones[modulo]) acciones[modulo] = [];
                    if (!acciones[modulo].includes(operacion)) {
                        acciones[modulo].push(operacion);
                    }
                }
            }

            const dataToken = {
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    perfil: {
                        id: usuario.perfil?.id,
                        nombre: usuario.perfil?.nombre,
                        acciones,
                    },
                    cliente: usuario.cliente,
                    sucursal: usuario.sucursal,
                },
            };

            const accessToken = generarToken({ data: dataToken, expiresIn: TOKEN_ACCESS_TIME });
            const refreshToken = generarToken({ data: dataToken, expiresIn: TOKEN_REFRESH_TIME });

            res.json({
                mensaje: MENSAJE_EXITO.SESION,
                accessToken,
                refreshToken,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: MENSAJE_ERROR.CREDENCIALES });
        }
    };
}
