import { Server, Socket } from "socket.io";
import { evaluarToken } from "../utils/token.js";
import type { UsuarioToken } from "../types/types.js";

// Extender el socket de Socket.io con los datos del usuario autenticado
interface SocketAutenticado extends Socket {
    usuario?: UsuarioToken;
}

export let io: Server;

/**
 * Inicializa el servidor de Socket.io sobre el httpServer de Express.
 * Debe llamarse antes de que el servidor empiece a escuchar.
 *
 * Cada socket se autentifica via JWT en el handshake y se une
 * automaticamente a la room de su sucursal o cliente.
 */
export const inicializarSocket = (servidorIo: Server): void => {
    io = servidorIo;

    // Middleware de autenticacion del socket
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;

        if (!token) {
            return next(new Error("Token de autenticacion requerido"));
        }

        const payload = evaluarToken({ token });

        if (!payload) {
            return next(new Error("Token invalido o expirado"));
        }

        // Adjuntar datos del usuario al socket para usarlos en la conexion
        (socket as SocketAutenticado).usuario = (payload as { usuario: UsuarioToken }).usuario;

        next();
    });

    io.on("connection", (socket) => {
        const autenticado = socket as SocketAutenticado;

        if (!autenticado.usuario) {
            socket.disconnect();
            return;
        }

        // Join automatico por JWT (usuarios con sucursal fija)
        if (autenticado.usuario.sucursal?.id) {
            socket.join(`sucursal:${autenticado.usuario.sucursal.id}`);
            console.log(`[WS] ${socket.id} → room sucursal:${autenticado.usuario.sucursal.id}`);
        }

        // Join dinamico: el cliente pide unirse al room de una sucursal especifica.
        // Util para admins sin sucursal fija que navegan entre sucursales.
        socket.on("unirse:sucursal", (idSucursal: number) => {
            if (typeof idSucursal !== "number") return;
            const room = `sucursal:${idSucursal}`;
            socket.join(room);
            console.log(`[WS] ${socket.id} → join dinamico ${room}`);
        });

        // Salir de un room de sucursal (limpieza al cambiar de vista)
        socket.on("salir:sucursal", (idSucursal: number) => {
            if (typeof idSucursal !== "number") return;
            socket.leave(`sucursal:${idSucursal}`);
        });
    });
};

