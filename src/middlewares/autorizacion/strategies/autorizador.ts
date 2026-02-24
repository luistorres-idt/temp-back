import { AppRequest } from "../../../types/types.js";

interface AutorizadorStrategy {
    autorizar(context: { req: AppRequest }): boolean;
}

export class Autorizador {
    #autorizador: AutorizadorStrategy | null = null;

    establecerAutorizador = (autorizador: AutorizadorStrategy): void => {
        this.#autorizador = autorizador;
    };

    autorizar = (context: { req: AppRequest }): boolean => {
        if (!this.#autorizador) return false;
        return this.#autorizador.autorizar(context);
    };
}

export type { AutorizadorStrategy };
