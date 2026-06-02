import { evaluarToken } from "../../../utils/token.js";
import type { AutenticacionContext, AutenticadorStrategy } from "./autenticador.js";
import type { UsuarioToken } from "../../../types/types.js";

const MENSAJE_ERROR_AUTENTICACION =
    "Las credenciales de autenticacion no son correctas o no ha ingresado las credenciales necesarias";

export class TokenAutenticadorStrategy implements AutenticadorStrategy {
    #obtenerDataHeader = (req: AutenticacionContext["req"]): { token: string } | null => {
        const authHeader = req.headers["authorization"];
        if (authHeader) {
            const [, token] = authHeader.split(" ");
            return token ? { token } : null;
        }

        const queryToken = req.query.token;
        if (queryToken && typeof queryToken === "string") {
            return { token: queryToken };
        }

        return null;
    };

    #verificarData = (req: AutenticacionContext["req"], { token }: { token: string }): boolean => {
        if (!token) return false;

        const dataToken = evaluarToken({ token });
        if (dataToken && typeof dataToken === "object") {
            req.usuario = (dataToken as Record<string, unknown>).usuario as UsuarioToken;
            return true;
        }

        return false;
    };

    autenticar = ({ req, res, next }: AutenticacionContext): void => {
        const data = this.#obtenerDataHeader(req);

        if (!data || !this.#verificarData(req, data)) {
            res.status(401).json({ error: MENSAJE_ERROR_AUTENTICACION });
            return;
        }

        next();
    };
}
