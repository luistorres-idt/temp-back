import { Redis } from "ioredis";
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from "./settings.js";

export const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD || undefined,
    lazyConnect: true, // No crashea el servidor al arrancar si Redis no está listo
    maxRetriesPerRequest: 3, // Evita cuelgues infinitos si se cae la conexión
});

redis.on("error", (err) => {
    console.error("Error de Redis:", err.message);
});
