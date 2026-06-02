import { Response } from "express";
import { AppRequest } from "../../../../types/types.js";
import { prisma } from "../../../../config/db.js";

interface ClienteSSE {
    res: Response;
    sucursales: number[] | null; // null significa todas (superusuario)
    usuarioId: number;
}

/**
 * Controlador de Server-Sent Events (SSE) para la transmisión en tiempo real
 * de telemetría de congeladores.
 */
export class TelemetriaStreamController {
    private static clientes: Set<ClienteSSE> = new Set();

    /**
     * Endpoint GET /api/monitoring/telemetria/stream
     * Establece la conexión SSE con el cliente.
     */
    static stream = async (req: AppRequest, res: Response): Promise<void> => {
        // Habilitar cabeceras de Server-Sent Events (SSE)
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders(); // Enviar cabeceras inmediatamente

        const usuario = req.usuario;
        if (!usuario) {
            res.write(`event: error\ndata: ${JSON.stringify({ error: "No autorizado" })}\n\n`);
            res.end();
            return;
        }

        let sucursalesPermitidas: number[] | null = null; // null = todas las sucursales (superusuario)

        // Determinar las sucursales autorizadas desde el JWT de forma segura
        if (usuario.sucursal?.id) {
            // Usuario con sucursal fija asignada (Supervisor, etc.)
            sucursalesPermitidas = [usuario.sucursal.id];
        } else if (usuario.cliente?.id) {
            // Usuario administrador: tiene acceso a todas las sucursales de su cliente
            try {
                const sucursales = await prisma.sucursal.findMany({
                    where: { idCliente: usuario.cliente.id, estatus: true },
                    select: { id: true },
                });
                sucursalesPermitidas = sucursales.map((s) => s.id);
            } catch (err) {
                console.error("[SSE] Error al obtener sucursales del cliente:", err);
                res.write(`event: error\ndata: ${JSON.stringify({ error: "Error interno al resolver sucursales del usuario" })}\n\n`);
                res.end();
                return;
            }
        }

        const cliente: ClienteSSE = {
            res,
            sucursales: sucursalesPermitidas,
            usuarioId: usuario.id,
        };

        TelemetriaStreamController.clientes.add(cliente);
        console.log(`[SSE] Cliente conectado (usuarioId: ${usuario.id}, sucursales autorizadas: ${sucursalesPermitidas ? sucursalesPermitidas.join(",") : "todas"}). Clientes activos: ${TelemetriaStreamController.clientes.size}`);

        // Enviar evento de conexión exitosa
        res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", message: "Conectado a la transmisión de telemetría" })}\n\n`);

        // Intervalo de ping (heartbeat) para evitar desconexiones por timeout y detectar conexiones cerradas
        const pingInterval = setInterval(() => {
            res.write(":\n\n"); // Comentario vacío para mantener activa la conexión
        }, 15000);

        // Limpiar al cerrar conexión
        req.on("close", () => {
            clearInterval(pingInterval);
            TelemetriaStreamController.clientes.delete(cliente);
            console.log(`[SSE] Cliente desconectado (usuarioId: ${usuario.id}). Clientes activos: ${TelemetriaStreamController.clientes.size}`);
            res.end();
        });
    };

    /**
     * Envía una lectura de telemetría a los clientes SSE conectados,
     * respetando sus filtros de sucursal autorizados.
     */
    static enviarTelemetria(data: {
        idCongelador: number | null;
        idDispositivo: number;
        nombreDispositivo: string;
        temperatura: number;
        ambiente: number;
        humedad: number | null;
        timestamp: string;
        idSucursal: number;
    }): void {
        const payload = JSON.stringify({
            idCongelador: data.idCongelador,
            idDispositivo: data.idDispositivo,
            nombreDispositivo: data.nombreDispositivo,
            temperatura: data.temperatura,
            ambiente: data.ambiente,
            humedad: data.humedad,
            timestamp: data.timestamp,
        });

        for (const cliente of TelemetriaStreamController.clientes) {
            // Si el cliente no tiene restricción (superusuario) o si la sucursal del evento está autorizada
            if (cliente.sucursales === null || cliente.sucursales.includes(data.idSucursal)) {
                cliente.res.write(`event: telemetria:nueva\ndata: ${payload}\n\n`);
            }
        }
    }
}
