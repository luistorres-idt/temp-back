import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import { PORT } from "./config/settings.js";
import { CORSMiddleware } from "./middlewares/cors.js";
import { AutenticacionMiddleware } from "./middlewares/autenticacion/autenticacion.js";
import { AutorizacionMiddleware } from "./middlewares/autorizacion/autorizacion.js";
import { PaginacionMiddleware } from "./middlewares/paginacion.js";
import { QueryMiddleware } from "./middlewares/query.js";
import { AppRouter } from "./routes/index.js";
import type { Application } from "express";

const app: Application = express();

// Seguridad
app.disable("x-powered-by");

// Middlewares globales
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(CORSMiddleware.execute());

// Ruta de health check (pública)
app.get("/healthy", (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        message: "API funcionando correctamente 🚀",
    });
});

// Middlewares de autenticación y autorización
//app.use(AutenticacionMiddleware.execute);
// app.use(AutorizacionMiddleware.execute); // Descomentar cuando se configuren los permisos

// Middlewares de paginación y filtros
app.use(PaginacionMiddleware.execute);
app.use(QueryMiddleware.execute);

// Rutas
app.use(AppRouter.routes);

// Error handler global
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof Error) {
        return res.status(500).json({ error: err.message.replace(/\n/g, "") });
    }
    return res.status(500).json({ error: "Ha ocurrido un error" });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}\n`);
});

export default app;
