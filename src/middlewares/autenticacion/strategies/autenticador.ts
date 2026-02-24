import type { Response, NextFunction } from "express";
import { AppRequest } from "../../../types/types.js";

interface AutenticacionContext {
    req: AppRequest;
    res: Response;
    next: NextFunction;
}

interface AutenticadorStrategy {
    autenticar(context: AutenticacionContext): void;
}

const MENSAJE_ERROR_AUTENTICACION =
    "Las credenciales de autenticacion no son correctas o no ha ingresado las credenciales necesarias";

export class Autenticador {
    #autenticador: AutenticadorStrategy | null = null;

    establecerAutenticador = (autenticador: AutenticadorStrategy): void => {
        this.#autenticador = autenticador;
    };

    autenticar = (context: AutenticacionContext): void => {
        if (!this.#autenticador) {
            context.res.status(401).json({ error: MENSAJE_ERROR_AUTENTICACION });
            return;
        }
        this.#autenticador.autenticar(context);
    };
}

export type { AutenticacionContext, AutenticadorStrategy };
