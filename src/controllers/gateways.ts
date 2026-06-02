import { BaseController } from "./base.js";
import { evaluarGateway, evaluarGatewayParcial } from "../schemas/gateways.js";
import { GatewayModel } from "../models/gateways.js";
import { Response } from "express";
import { AppRequest } from "../types/types.js";
import crypto from "crypto";
import { prisma } from "../config/db.js";

export class GatewaysController extends BaseController {
    constructor() {
        super({
            model: GatewayModel,
            evaluarCreacion: evaluarGateway,
            evaluarEdicion: evaluarGatewayParcial,
        });
    }

    generarToken = async (req: AppRequest, res: Response): Promise<void> => {
        const id = req.params.id as string;

        try {
            const gatewayId = parseInt(id, 10);
            if (isNaN(gatewayId)) {
                res.status(400).json({ error: "ID de gateway no válido" });
                return;
            }

            // Verificar que el gateway exista y esté activo
            const gateway = await prisma.gateway.findUnique({
                where: { id: gatewayId }
            });

            if (!gateway) {
                res.status(404).json({ error: "Gateway no encontrado" });
                return;
            }

            // Generar API Key
            const token = "gw_prod_" + crypto.randomBytes(24).toString("hex");
            const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

            // Guardar hash en la base de datos
            await prisma.gateway.update({
                where: { id: gatewayId },
                data: { tokenHash }
            });

            res.status(200).json({
                mensaje: "API Key generada correctamente",
                token: token // Se devuelve en plano una sola vez
            });
        } catch (err) {
            console.error("Error al generar API Key del gateway:", err);
            res.status(500).json({ error: "Error al generar la API Key" });
        }
    };

    eliminarToken = async (req: AppRequest, res: Response): Promise<void> => {
        const id = req.params.id as string;

        try {
            const gatewayId = parseInt(id, 10);
            if (isNaN(gatewayId)) {
                res.status(400).json({ error: "ID de gateway no válido" });
                return;
            }

            // Verificar que el gateway exista
            const gateway = await prisma.gateway.findUnique({
                where: { id: gatewayId }
            });

            if (!gateway) {
                res.status(404).json({ error: "Gateway no encontrado" });
                return;
            }

            // Eliminar hash en la base de datos
            await prisma.gateway.update({
                where: { id: gatewayId },
                data: { tokenHash: null }
            });

            res.status(200).json({
                mensaje: "API Key eliminada correctamente"
            });
        } catch (err) {
            console.error("Error al eliminar API Key del gateway:", err);
            res.status(500).json({ error: "Error al eliminar la API Key" });
        }
    };
}
