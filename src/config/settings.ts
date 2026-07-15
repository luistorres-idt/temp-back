import "dotenv/config";
import { z } from "zod/v4";

const settingsSchema = z.object({
    PORT: z.coerce.number().default(3000),
    TOKEN_SECRET_KEY: z.string(),
    TOKEN_ACCESS_TIME: z.string().default("8h"),
    TOKEN_REFRESH_TIME: z.string().default("7d"),
    OPENWEATHER_API_KEY: z.string(),
    GMAIL_USER: z.string().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),
    CRON_TIMEZONE: z.string().default("America/Mexico_City"),
    REDIS_HOST: z.string().default("127.0.0.1"),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),
});

const result = settingsSchema.safeParse(process.env);

if (!result.success) {
    console.error("❌ Error en las variables de entorno:", result.error.format());
    process.exit(1);
}

export const {
    PORT,
    TOKEN_SECRET_KEY,
    TOKEN_ACCESS_TIME,
    TOKEN_REFRESH_TIME,
    OPENWEATHER_API_KEY,
    GMAIL_USER,
    GMAIL_APP_PASSWORD,
    CRON_TIMEZONE,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
} = result.data;
