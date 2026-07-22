import { describe, it, expect, vi, beforeEach } from "vitest";
import { autenticarGateway } from "../../../middlewares/autenticacion/autenticacionGateway.js";
import { AppRequest } from "../../../types/types.js";
import { Response } from "express";
import crypto from "crypto";

const mockFindUnique = vi.fn();
const mockRedisSet = vi.fn();

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

vi.mock("../../../config/redis.js", () => {
    return {
        redis: {
            get set() {
                return mockRedisSet;
            }
        }
    };
});

describe("autenticarGateway middleware (Signature Authentication)", () => {
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
        mockRedisSet.mockResolvedValue("OK");
    });

    it("debe retornar 401 si no se proveen cabeceras de firma digital ni nonce/timestamp", async () => {
        mockReq = {
            header: vi.fn().mockReturnValue(undefined),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "No autorizado. Firma digital y cabeceras de seguridad requeridas."
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe retornar 401 si falta el identificador en el body", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "X-Gateway-Signature") return "signature";
                if (name === "X-Gateway-Timestamp") return String(Date.now());
                if (name === "X-Gateway-Nonce") return "nonce";
                return undefined;
            }),
            body: {},
        };

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "No autorizado. Identificador de gateway no proporcionado."
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe retornar 400 si las cabeceras de firma están incompletas", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "X-Gateway-Signature") return "some-signature";
                return undefined;
            }),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "Cabeceras de firma digital incompletas (requiere Firma, Timestamp y Nonce)."
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe retornar 401 si el timestamp está fuera de la tolerancia", async () => {
        const expTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutos atrás
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "X-Gateway-Signature") return "some-sig";
                if (name === "X-Gateway-Timestamp") return String(expTimestamp);
                if (name === "X-Gateway-Nonce") return "some-nonce";
                return undefined;
            }),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "Petición expirada o desfase de reloj excesivo."
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe retornar 401 si el gateway no existe en base de datos", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "X-Gateway-Signature") return "some-sig";
                if (name === "X-Gateway-Timestamp") return String(Date.now());
                if (name === "X-Gateway-Nonce") return "some-nonce";
                return undefined;
            }),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };

        mockFindUnique.mockResolvedValue(null);

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Gateway no registrado." });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe retornar 401 si el gateway está inactivo (estatus = false)", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "X-Gateway-Signature") return "some-sig";
                if (name === "X-Gateway-Timestamp") return String(Date.now());
                if (name === "X-Gateway-Nonce") return "some-nonce";
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

    it("debe retornar 401 si el gateway no tiene clave pública registrada", async () => {
        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "X-Gateway-Signature") return "some-sig";
                if (name === "X-Gateway-Timestamp") return String(Date.now());
                if (name === "X-Gateway-Nonce") return "some-nonce";
                return undefined;
            }),
            body: { identificador: "00:1A:2B:3C:4D:5E" },
        };
        mockFindUnique.mockResolvedValue({
            id: 1,
            identificador: "00:1A:2B:3C:4D:5E",
            estatus: true,
            publicKeyPem: null,
        });

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "El gateway no tiene configurada una clave pública para verificar la firma."
        });
    });

    it("debe retornar 401 si el nonce ya ha sido utilizado (replay attack)", async () => {
        const timestamp = String(Date.now());
        const nonce = "nonce123";
        const body = { identificador: "00:1A:2B:3C:4D:5E" };

        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "X-Gateway-Signature") return "some-sig";
                if (name === "X-Gateway-Timestamp") return timestamp;
                if (name === "X-Gateway-Nonce") return nonce;
                return undefined;
            }),
            body,
        };

        mockFindUnique.mockResolvedValue({
            id: 1,
            identificador: "00:1A:2B:3C:4D:5E",
            estatus: true,
            publicKeyPem: "some-key",
        });

        mockRedisSet.mockResolvedValue("DUPLICADO"); // Simular que el nonce ya existe

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "Transacción duplicada (Nonce ya utilizado)."
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it("debe autenticar exitosamente si la firma es válida", async () => {
        const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
            namedCurve: "prime256v1",
        });
        const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }) as string;

        const timestamp = String(Date.now());
        const nonce = "nonce123";
        const body = { identificador: "00:1A:2B:3C:4D:5E", data: [] };
        
        const message = `${JSON.stringify(body)}|${timestamp}|${nonce}`;
        const signer = crypto.createSign("SHA256");
        signer.update(message);
        signer.end();
        const signature = signer.sign(privateKey, "base64");

        mockReq = {
            header: vi.fn().mockImplementation((name) => {
                if (name === "X-Gateway-Signature") return signature;
                if (name === "X-Gateway-Timestamp") return timestamp;
                if (name === "X-Gateway-Nonce") return nonce;
                return undefined;
            }),
            body,
        };

        const mockGateway = {
            id: 1,
            identificador: "00:1A:2B:3C:4D:5E",
            estatus: true,
            publicKeyPem,
        };
        mockFindUnique.mockResolvedValue(mockGateway);

        await autenticarGateway(mockReq as AppRequest, mockRes as Response, nextFunction);

        expect(mockRes.status).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
        expect(mockReq.gateway).toEqual(mockGateway);
        expect(mockReq.firmaGateway).toBe(signature);
    });
});
