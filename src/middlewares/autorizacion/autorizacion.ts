import { Response, NextFunction } from "express";
import { AppRequest } from "../../types/types.js";
import { Autorizador } from "./strategies/autorizador.js";
import { TokenAutorizadorStrategy } from "./strategies/tokenAutorizadorStrategy.js";

export class AutorizacionMiddleware {
    static execute(req: AppRequest, res: Response, next: NextFunction): void {
        if (req.path.includes("/autenticacion")) return next();

        const autorizador = new Autorizador();

        if (req.headers["authorization"]) {
            autorizador.establecerAutorizador(new TokenAutorizadorStrategy());
        }

        const context = { req };

        if (!autorizador.autorizar(context)) {
            res.status(401).json({
                error: "No cuentas con los permisos para acceder o modificar los recursos solicitados",
            });
            return;
        }

        next();
    }
}
