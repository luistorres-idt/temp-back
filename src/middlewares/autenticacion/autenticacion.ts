import { Response, NextFunction } from "express";
import { AppRequest } from "../../types/types.js";
import { Autenticador } from "./strategies/autenticador.js";
import { TokenAutenticadorStrategy } from "./strategies/tokenAutenticadorStrategy.js";

export class AutenticacionMiddleware {
    static execute(req: AppRequest, res: Response, next: NextFunction): void {
        // Rutas públicas (login, register)
        if (req.path.includes("/autenticacion")) return next();

        if (req.path.includes("/data") && req.method == "POST") return next();

        const autenticador = new Autenticador();

        // Autenticación por token JWT
        if (req.headers["authorization"]) {
            autenticador.establecerAutenticador(new TokenAutenticadorStrategy());
        }

        const context = { req, res, next };
        autenticador.autenticar(context);
    }
}
