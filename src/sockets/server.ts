import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "node:http";

/**
 * Inicializa el servidor de Socket.IO sobre un servidor HTTP existente.
 *
 * Configura CORS permisivo (ajustar en produccion) y registra listeners
 * base de conexion y desconexion con logs descriptivos.
 *
 * @param httpServer - Instancia del servidor HTTP de Node.js.
 * @returns La instancia configurada de Socket.IO Server.
 */
export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

        socket.on("disconnect", (reason) => {
            console.log(`[Socket.IO] Cliente desconectado: ${socket.id} (${reason})`);
        });
    });

    console.log("[Socket.IO] Servidor inicializado");

    return io;
}
