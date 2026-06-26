import { ACCIONES } from "../../../utils/acciones.js";
import type { AutorizadorStrategy } from "./autorizador.js";
import type { AppRequest } from "../../../types/types.js";
import { PERFILES } from "../../../utils/perfiles.js";

const RECURSO_A_MODULO: Record<string, string> = {
    acciones: "accion",
    modulos: "modulo",
    operaciones: "operacion",
    perfiles: "perfil",
    permisos: "permiso",
    usuarios: "usuario",
    clientes: "cliente",
    sucursales: "sucursal",
    secciones: "seccion",
    congeladores: "congelador",
    gateways: "gateway",
    dispositivos: "dispositivo",
    data: "data",
    infoestatus: "infoestatus",
    "info-estatus": "infoestatus",
    reportes: "reporte",
};

export class TokenAutorizadorStrategy implements AutorizadorStrategy {
    #mapearPermisos = (req: AppRequest): Record<string, string[]> => {
        const { usuario } = req;
        if (!usuario?.perfil?.acciones) return {};
        return usuario.perfil.acciones;
    };

    #autorizarAccesoRuta = (permisos: Record<string, string[]>, req: AppRequest): boolean => {
        // Si el usuario es superusuario, tiene acceso completo a todo
        if (req.usuario?.perfil?.nombre === PERFILES.SUPERUSUARIO) {
            return true;
        }

        const [, , recursoOriginal] = req.path.split("/");
        if (!recursoOriginal) return false;

        const recurso = RECURSO_A_MODULO[recursoOriginal.toLowerCase()] || recursoOriginal.toLowerCase();

        // Permitir a usuarios ver y editar su propio cliente (ej. para la hora de reportes)
        if (recurso === "cliente" && req.usuario?.cliente?.id) {
            const parts = req.path.split("/");
            const idParam = parts[3];
            if (idParam) {
                const idClienteParam = parseInt(idParam, 10);
                if (!isNaN(idClienteParam) && req.usuario.cliente.id === idClienteParam) {
                    if (req.method === "GET" || req.method === "PATCH") {
                        return true;
                    }
                }
            }
        }

        // Bypass de rutas de monitoreo, ya que manejan su propio control de acceso/scoping
        if (recurso === "monitoring") {
            return true;
        }

        // Para reportes, permitir a administradores
        if (recurso === "reportes" || recurso === "reporte") {
            return req.usuario?.perfil?.nombre === PERFILES.ADMINISTRADOR;
        }

        const accion = ACCIONES[req.method];
        if (!accion) return false;

        return !!(permisos[recurso] && permisos[recurso].includes(accion));
    };

    autorizar = ({ req }: { req: AppRequest }): boolean => {
        const permisosMapeados = this.#mapearPermisos(req);
        return this.#autorizarAccesoRuta(permisosMapeados, req);
    };
}
