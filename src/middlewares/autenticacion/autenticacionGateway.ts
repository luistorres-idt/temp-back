import { Response, NextFunction } from "express";
import crypto from "crypto";
import { AppRequest } from "../../types/types.js";
import { prisma } from "../../config/db.js";
import { redis } from "../../config/redis.js";

const TOLERANCIA_MS = 5 * 60 * 1000; // 5 minutos

export async function autenticarGateway(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    const identificador = req.body?.identificador; // MAC del gateway enviada en el JSON

    const firmaBase64 = req.header("X-Gateway-Signature");
    const timestampStr = req.header("X-Gateway-Timestamp");
    const nonce = req.header("X-Gateway-Nonce");

    console.log("\n=================== DEBUG INGESTION GATEWAY ===================");
    console.log("Headers recibidos:");
    console.log(`- X-Gateway-Signature: ${firmaBase64 || "NO ENVIADO"}`);
    console.log(`- X-Gateway-Timestamp: ${timestampStr || "NO ENVIADO"}`);
    console.log(`- X-Gateway-Nonce: ${nonce || "NO ENVIADO"}`);
    console.log(`- Body identificador (MAC): ${identificador || "NO ENVIADO"}`);
    console.log(`Body completo recibido:`, JSON.stringify(req.body));

    if (!firmaBase64 && !timestampStr && !nonce) {
        console.log("Error: No se recibieron las cabeceras de firma digital.");
        res.status(401).json({ error: "No autorizado. Firma digital y cabeceras de seguridad requeridas." });
        return;
    }

    if (!identificador) {
        console.log("Error: No se especificó el identificador del gateway en el body.");
        res.status(401).json({ error: "No autorizado. Identificador de gateway no proporcionado." });
        return;
    }

    if (!firmaBase64 || !timestampStr || !nonce) {
        console.log("Error: Cabeceras de firma incompletas.");
        res.status(400).json({ error: "Cabeceras de firma digital incompletas (requiere Firma, Timestamp y Nonce)." });
        return;
    }

    // 1. Validar Timestamp
    const timestamp = parseInt(timestampStr, 10);
    const ahora = Date.now();
    const diferencia = Math.abs(ahora - timestamp);
    console.log(`Validación de Timestamp:`);
    console.log(`- Servidor ahora: ${ahora} (${new Date(ahora).toISOString()})`);
    console.log(`- Gateway timestamp: ${timestamp} (${isNaN(timestamp) ? "inválido" : new Date(timestamp).toISOString()})`);
    console.log(`- Diferencia de tiempo: ${diferencia} ms (Tolerancia máxima: ${TOLERANCIA_MS} ms)`);

    if (isNaN(timestamp) || diferencia > TOLERANCIA_MS) {
        console.log("Error: Petición expirada o desfase de reloj excesivo.");
        res.status(401).json({ error: "Petición expirada o desfase de reloj excesivo." });
        return;
    }

    try {
        // 2. Buscar el gateway por su identificador único
        const gateway = await prisma.gateway.findUnique({
            where: { identificador }
        });

        console.log(`Búsqueda en Base de Datos:`);
        if (!gateway) {
            console.log(`- Gateway con MAC "${identificador}":  NO REGISTRADO en BD`);
            res.status(401).json({ error: "Gateway no registrado." });
            return;
        }

        console.log(`- Gateway con MAC "${identificador}": Encontrado en BD (ID: ${gateway.id}, Nombre: ${gateway.nombre})`);
        console.log(`- Estatus del Gateway: ${gateway.estatus ? "Activo" : "Inactivo"}`);

        if (!gateway.estatus) {
            console.log("Error: El gateway está inactivo.");
            res.status(401).json({ error: "El gateway asociado se encuentra inactivo." });
            return;
        }

        // 3. Validar Nonce en Redis para evitar replay attacks
        const cacheKey = `nonce:${gateway.id}:${nonce}`;
        const setResultado = await redis.set(cacheKey, "1", "PX", TOLERANCIA_MS, "NX");
        console.log(`Validación de Nonce (Evitar Replay):`);
        console.log(`- Cache Key: ${cacheKey}`);
        console.log(`- Resultado Redis SET NX PX: ${setResultado}`);

        if (setResultado !== "OK") {
            console.log("Error: Transacción duplicada (el Nonce ya fue utilizado en los últimos 5 minutos).");
            res.status(401).json({ error: "Transacción duplicada (Nonce ya utilizado)." });
            return;
        }

        // 4. Validar que el Gateway tenga configurada su clave pública
        console.log(`Clave pública registrada en BD:`, gateway.publicKeyPem ? "Sí (PEM)" : "No (nula)");
        if (!gateway.publicKeyPem) {
            console.log("Error: El gateway no tiene cargada su clave pública PEM en la base de datos.");
            res.status(401).json({ error: "El gateway no tiene configurada una clave pública para verificar la firma." });
            return;
        }

        // 5. Reconstruir el mensaje y verificar firma
        const payloadString = JSON.stringify(req.body);
        const mensajeParaVerificar = `${payloadString}|${timestampStr}|${nonce}`;
        console.log(`Verificación de firma criptográfica:`);
        console.log(`- Mensaje a verificar: "${mensajeParaVerificar}"`);

        const verifier = crypto.createVerify("SHA256");
        verifier.update(mensajeParaVerificar);
        verifier.end();

        const firmaValida = verifier.verify(gateway.publicKeyPem, firmaBase64, "base64");
        console.log(`- ¿Firma criptográfica válida?: ${firmaValida ? "✅ SÍ" : "❌ NO"}`);

        if (!firmaValida) {
            console.log("Error: Firma digital inválida.");
            res.status(401).json({ error: "Firma digital inválida. Petición rechazada por no repudio." });
            return;
        }

        console.log("AUTENTICACIÓN EXITOSA. Enviando al caso de uso de ingesta.");
        console.log("===============================================================\n");

        // Guardar datos en el request
        req.gateway = gateway;
        req.firmaGateway = firmaBase64;
        next();
    } catch (err) {
        console.error("Error interno en autenticarGateway:", err);
        res.status(500).json({ error: "Error interno del servidor al verificar la firma del gateway." });
    }
}
