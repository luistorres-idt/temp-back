import { Router } from "express";
import { crearRouterCRUD } from "./base.js";
import { crearRouterAutenticacion } from "./autenticacion.js";
import { AccionesController } from "../controllers/acciones.js";
import { ModulosController } from "../controllers/modulos.js";
import { OperacionesController } from "../controllers/operaciones.js";
import { PerfilesController } from "../controllers/perfiles.js";
import { UsuariosController } from "../controllers/usuarios.js";
import { ClientesController } from "../controllers/clientes.js";
import { SucursalesController } from "../controllers/sucursales.js";
import { SeccionesController } from "../controllers/secciones.js";
import { CongeladoresController } from "../controllers/congeladores.js";
import { GatewaysController } from "../controllers/gateways.js";
import { DispositivosController } from "../controllers/dispositivos.js";
import { DataController } from "../controllers/data.js";
import { InfoEstatusController } from "../controllers/infoEstatus.js";
import { AutenticacionMiddleware } from "../middlewares/autenticacion/autenticacion.js";
import {
    QueryClientesMiddleware,
    QuerySucursalesMiddleware,
    QuerySeccionesMiddleware,
    QueryCongeladoresMiddleware,
    QueryDispositivosMiddleware,
    QueryUsuariosMiddleware,
} from "../middlewares/query.js";

export class AppRouter {
    static get routes(): Router {
        const router = Router();

        // ----------------------------------------------------------------
        // Rutas PÚBLICAS — no requieren autenticación
        // Definidas antes del middleware de auth global de app.ts
        // ----------------------------------------------------------------
        router.use("/api/autenticacion", crearRouterAutenticacion());

        // Ingesta de data desde dispositivos IoT (sin token de usuario)
        const dataController = new DataController();
        router.post("/api/data", dataController.crearElemento);

        // ----------------------------------------------------------------
        // Middleware de autenticación — protege todo lo que viene después
        // ----------------------------------------------------------------
        router.use(AutenticacionMiddleware.execute);

        // ----------------------------------------------------------------
        // Rutas PROTEGIDAS con scoping por perfil de usuario
        // ----------------------------------------------------------------
        router.use("/api/acciones", crearRouterCRUD(new AccionesController()));
        router.use("/api/modulos", crearRouterCRUD(new ModulosController()));
        router.use("/api/operaciones", crearRouterCRUD(new OperacionesController()));
        router.use("/api/perfiles", crearRouterCRUD(new PerfilesController()));
        router.use("/api/usuarios", QueryUsuariosMiddleware.execute, crearRouterCRUD(new UsuariosController()));
        router.use("/api/clientes", QueryClientesMiddleware.execute, crearRouterCRUD(new ClientesController()));
        router.use("/api/sucursales", QuerySucursalesMiddleware.execute, crearRouterCRUD(new SucursalesController()));
        router.use("/api/secciones", QuerySeccionesMiddleware.execute, crearRouterCRUD(new SeccionesController()));

        // Ruta especial de telemetria del congelador — debe ir antes del CRUD
        const congeladoresController = new CongeladoresController();
        router.get("/api/congeladores/:id/telemetria", congeladoresController.obtenerTelemetria);
        router.use("/api/congeladores", QueryCongeladoresMiddleware.execute, crearRouterCRUD(congeladoresController));
        router.use("/api/gateways", crearRouterCRUD(new GatewaysController()));
        router.use("/api/dispositivos", QueryDispositivosMiddleware.execute, crearRouterCRUD(new DispositivosController()));

        // GET y PATCH de data también protegidos (solo el POST es público)
        router.use("/api/data", crearRouterCRUD(dataController));
        router.use("/api/info-estatus", crearRouterCRUD(new InfoEstatusController()));

        return router;
    }
}
