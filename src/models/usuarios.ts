import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { usuarioSelect } from "../schemas/usuarios.js";
import type { UsuarioResponse, UsuarioInput, UsuarioInputParcial } from "../types/usuarios.js";

/**
 * Repositorio de usuarios que extiende BaseRepository con métodos específicos
 * para autenticación (obtenerPorCorreo con select de password + permisos).
 */
export class UsuarioRepository extends BaseRepository<UsuarioResponse, UsuarioInput, UsuarioInputParcial> {
    async obtenerPorCorreo({ correo }: { correo: string }) {
        return this.delegate.findFirst({
            where: { correo, estatus: true },
            select: {
                ...usuarioSelect,
                password: true,
                perfil: {
                    select: {
                        id: true,
                        nombre: true,
                        permisos: {
                            where: { estatus: true },
                            select: {
                                accion: {
                                    select: {
                                        nombre: true,
                                        modulo: { select: { nombre: true } },
                                        operacion: { select: { nombre: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }
}

export const UsuarioModel = new UsuarioRepository(prisma.usuario, usuarioSelect);
