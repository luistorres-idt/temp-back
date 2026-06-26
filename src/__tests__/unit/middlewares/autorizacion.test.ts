import { describe, it, expect, vi, beforeEach } from "vitest";
import { AutorizacionMiddleware } from "../../../middlewares/autorizacion/autorizacion.js";
import { AppRequest } from "../../../types/types.js";
import { Response } from "express";

describe("AutorizacionMiddleware", () => {
    let mockReq: Partial<AppRequest>;
    let mockRes: Partial<Response>;
    let nextFunction = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        nextFunction = vi.fn();
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
    });

    it("debe permitir el acceso libre a rutas de autenticación", () => {
        mockReq = {
            path: "/api/autenticacion/login",
            headers: {},
        };

        AutorizacionMiddleware.execute(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("debe denegar el acceso si no hay autorización ni credenciales correctas", () => {
        mockReq = {
            path: "/api/sucursales",
            headers: {},
        };

        AutorizacionMiddleware.execute(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "No cuentas con los permisos para acceder o modificar los recursos solicitados",
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe permitir el acceso completo si el usuario es superusuario", () => {
        mockReq = {
            path: "/api/sucursales",
            headers: {
                authorization: "Bearer token123",
            },
            method: "POST",
            usuario: {
                id: 1,
                nombre: "Admin",
                correo: "admin@mail.com",
                perfil: {
                    id: 1,
                    nombre: "superusuario",
                    acciones: {},
                },
            },
        };

        AutorizacionMiddleware.execute(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
    });

    it("debe permitir acceso si el usuario cuenta con el permiso mapeado singular de la ruta plural", () => {
        mockReq = {
            path: "/api/sucursales",
            headers: {
                authorization: "Bearer token123",
            },
            method: "GET",
            usuario: {
                id: 2,
                nombre: "Juan",
                correo: "juan@mail.com",
                perfil: {
                    id: 2,
                    nombre: "administrador",
                    acciones: {
                        sucursal: ["ver"],
                    },
                },
            },
        };

        AutorizacionMiddleware.execute(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
    });

    it("debe denegar acceso si el usuario tiene el permiso de visualización pero intenta editar", () => {
        mockReq = {
            path: "/api/sucursales/1",
            headers: {
                authorization: "Bearer token123",
            },
            method: "PATCH",
            usuario: {
                id: 2,
                nombre: "Juan",
                correo: "juan@mail.com",
                perfil: {
                    id: 2,
                    nombre: "administrador",
                    acciones: {
                        sucursal: ["ver"],
                    },
                },
            },
        };

        AutorizacionMiddleware.execute(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe hacer bypass de las rutas de monitoring", () => {
        mockReq = {
            path: "/api/monitoring/telemetria/stream",
            headers: {
                authorization: "Bearer token123",
            },
            method: "GET",
            usuario: {
                id: 3,
                nombre: "Supervisor",
                correo: "supervisor@mail.com",
                perfil: {
                    id: 3,
                    nombre: "supervisor",
                    acciones: {},
                },
            },
        };

        AutorizacionMiddleware.execute(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
    });

    it("debe permitir reportes al perfil administrador y denegar a otros", () => {
        // Administrador
        const reqAdmin = {
            path: "/api/reportes/sucursales/1/calcular",
            headers: {
                authorization: "Bearer token123",
            },
            method: "POST",
            usuario: {
                id: 2,
                nombre: "Juan",
                correo: "juan@mail.com",
                perfil: {
                    id: 2,
                    nombre: "administrador",
                    acciones: {},
                },
            },
        };

        AutorizacionMiddleware.execute(reqAdmin as AppRequest, mockRes as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();

        // Supervisor (bloqueado)
        nextFunction.mockClear();
        const resMockBlocked = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        const reqSupervisor = {
            path: "/api/reportes/sucursales/1/calcular",
            headers: {
                authorization: "Bearer token123",
            },
            method: "POST",
            usuario: {
                id: 3,
                nombre: "Supervisor",
                correo: "supervisor@mail.com",
                perfil: {
                    id: 3,
                    nombre: "supervisor",
                    acciones: {},
                },
            },
        };

        AutorizacionMiddleware.execute(reqSupervisor as AppRequest, resMockBlocked as Response, nextFunction);
        expect(resMockBlocked.status).toHaveBeenCalledWith(401);
        expect(nextFunction).not.toHaveBeenCalled();
    });
});
