import { Response, NextFunction } from "express";
import { AppRequest } from "../../types/types.js";
import { Autenticador } from "./strategies/autenticador.js";
import { TokenAutenticadorStrategy } from "./strategies/tokenAutenticadorStrategy.js";

export class AutenticacionMiddleware {
    static execute(req: AppRequest, res: Response, next: NextFunction): void {
        const autenticador = new Autenticador();

        if (req.headers["authorization"] || req.query.token) {
            autenticador.establecerAutenticador(new TokenAutenticadorStrategy());
        }

        const context = { req, res, next };
        autenticador.autenticar(context);
    }
}
