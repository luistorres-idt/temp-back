import { describe, it, expect, vi, beforeEach } from "vitest";
import { autenticarGateway } from "../../../middlewares/autenticacion/autenticacionGateway.js";
import { AppRequest } from "../../../types/types.js";
import { Response } from "express";
import crypto from "crypto";

const mockFindUnique = vi.fn();

vi.mock("../../../config/db.js", () => {
    return {
        prisma: {
            gateway: {
                get findUnique() {
                    return mockFindUnique;
                }
            }
        }
    };
});

describe("autenticarGateway middleware", () => {
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

    it("debe retornar 401 si no hay Authorization header", async () => {
        mockReq = {
            header: vi.fn().mockReturnValue(undefined),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.stringContaining("Credenciales de gateway no proporcionadas")
        }));
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe retornar 401 si el token no empieza con Bearer", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "Authorization") return "Basic abc123";
                return undefined;
            }),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe retornar 401 si falta el identificador en el body", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "Authorization") return "Bearer token123";
                return undefined;
            }),
            body: {},
        };

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe retornar 401 si el gateway no existe en base de datos", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "Authorization") return "Bearer token123";
                return undefined;
            }),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };

        mockFindUnique.mockResolvedValue(null);

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Token de gateway no válido." });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe retornar 401 si el gateway está inactivo (estatus = false)", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "Authorization") return "Bearer token123";
                return undefined;
            }),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };

        mockFindUnique.mockResolvedValue({
            id: 1,
            identificador: "00:1A:2B:3C:4D:5E",
            estatus: false,
        });

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "El gateway asociado se encuentra inactivo." });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe retornar 401 si el identificador en la base de datos no coincide con el del body", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "Authorization") return "Bearer token123";
                return undefined;
            }),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };

        mockFindUnique.mockResolvedValue({
            id: 1,
            identificador: "OTRA-MAC-DIFERENTE",
            estatus: true,
        });

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "El token no corresponde al identificador del gateway enviado." });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe autenticar exitosamente y llamar a next() si el token y la MAC son correctos y el gateway está activo", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "Authorization") return "Bearer token123";
                return undefined;
            }),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };

        const mockGateway = {
            id: 1,
            identificador: "00:1A:2B:3C:4D:5E",
            estatus: true,
            tokenHash: crypto.createHash("sha256").update("token123").digest("hex")
        };
        mockFindUnique.mockResolvedValue(mockGateway);

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockReq.gateway).toEqual(mockGateway);
        expect(nextFunction).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });
});
