import { ACCIONES } from "../../../utils/acciones.js";
import type { AutorizadorStrategy } from "./autorizador.js";
import type { AppRequest } from "../../../types/types.js";

export class TokenAutorizadorStrategy implements AutorizadorStrategy {
    #mapearPermisos = (req: AppRequest): Record<string, string[]> => {
        const { usuario } = req;
        if (!usuario?.perfil?.acciones) return {};
        return usuario.perfil.acciones;
    };

    #autorizarAccesoRuta = (permisos: Record<string, string[]>, req: AppRequest): boolean => {
        const [, , recurso] = req.path.split("/");
        const accion = ACCIONES[req.method];

        return !!(permisos[recurso] && permisos[recurso].includes(accion));
    };

    autorizar = ({ req }: { req: AppRequest }): boolean => {
        const permisosMapeados = this.#mapearPermisos(req);
        return this.#autorizarAccesoRuta(permisosMapeados, req);
    };
}
