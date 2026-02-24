import jwt, { type SignOptions } from "jsonwebtoken";
import { TOKEN_SECRET_KEY } from "../config/settings.js";

interface GenerarTokenParams {
    data: Record<string, unknown>;
    expiresIn: string;
}

export const generarToken = ({ data, expiresIn }: GenerarTokenParams): string => {
    const options: SignOptions = { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] };
    return jwt.sign(data, TOKEN_SECRET_KEY, options);
};

export const evaluarToken = ({ token }: { token: string }): Record<string, unknown> | false => {
    try {
        return jwt.verify(token, TOKEN_SECRET_KEY) as Record<string, unknown>;
    } catch {
        return false;
    }
};
