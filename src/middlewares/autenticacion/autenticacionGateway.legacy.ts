import { Response, NextFunction } from "express";
import crypto from "crypto";
import { AppRequest } from "../../types/types.js";
import { prisma } from "../../config/db.js";

export async function autenticarGatewayLegacy(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    const identificador = req.body?.identificador; // MAC del gateway enviada en el JSON
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ") || !identificador) {
        res.status(401).json({ error: "No autorizado. Credenciales de gateway no proporcionadas o incompletas." });
        return;
    }

    const token = authHeader.substring(7); // Extrae la API Key

    // Calcular hash SHA-256 del token recibido
    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    try {
        // Buscar el gateway por su hash de token
        const gateway = await prisma.gateway.findUnique({
            where: { tokenHash }
        });

        if (!gateway) {
            res.status(401).json({ error: "Token de gateway no válido." });
            return;
        }

        if (!gateway.estatus) {
            res.status(401).json({ error: "El gateway asociado se encuentra inactivo." });
            return;
        }

        if (gateway.identificador !== identificador) {
            res.status(401).json({ error: "El token no corresponde al identificador del gateway enviado." });
            return;
        }

        // Guardar los datos del gateway en la request por si el use case los necesita
        req.gateway = gateway; 
        next();
    } catch (err) {
        console.error("Error al autenticar el gateway por token legacy:", err);
        res.status(500).json({ error: "Error interno del servidor al verificar las credenciales del gateway." });
    }
}
