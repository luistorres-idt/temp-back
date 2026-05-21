import "dotenv/config";
import { z } from "zod/v4";

const settingsSchema = z.object({
    PORT: z.coerce.number().default(3000),
    TOKEN_SECRET_KEY: z.string(),
    TOKEN_ACCESS_TIME: z.string().default("8h"),
    TOKEN_REFRESH_TIME: z.string().default("7d"),
    DATABASE_HOST: z.string(),
    DATABASE_USER: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_NAME: z.string(),
    OPENWEATHER_API_KEY: z.string(),
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
} = result.data;
