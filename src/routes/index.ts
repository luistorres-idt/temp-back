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
// [DDD] Bounded Context: Monitoring
import { DataControllerV2 } from "../modules/monitoring/infrastructure/http/DataControllerV2.js";
import { CongeladoresControllerV2 } from "../modules/monitoring/infrastructure/http/CongeladoresControllerV2.js";
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
        router.use("/api/usuarios", QueryUsuariosMiddleware.execute, crearRouterCRUD(new UsuariosController()));


        // Ingesta de data desde dispositivos IoT (sin token de usuario)
        // [DDD] Usando DataControllerV2 — logica extraida a IngerirDatosSensor use case
        const dataControllerV2 = new DataControllerV2();
        router.post("/api/data", dataControllerV2.crearElemento);

        // [legacy] dataController para GET/PATCH de data protegidos — se migrara en fase siguiente
        const dataController = new DataController();

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
        router.use("/api/clientes", QueryClientesMiddleware.execute, crearRouterCRUD(new ClientesController()));
        router.use("/api/sucursales", QuerySucursalesMiddleware.execute, crearRouterCRUD(new SucursalesController()));
        router.use("/api/secciones", QuerySeccionesMiddleware.execute, crearRouterCRUD(new SeccionesController()));

        // [DDD] Usando CongeladoresControllerV2 — logica extraida a ObtenerTelemetria use case
        const congeladoresControllerV2 = new CongeladoresControllerV2();
        router.get("/api/congeladores/:id/telemetria", congeladoresControllerV2.obtenerTelemetria);
        // [legacy] CRUD de congeladores aun usa el controller anterior
        const congeladoresController = new CongeladoresController();
        router.use("/api/congeladores", QueryCongeladoresMiddleware.execute, crearRouterCRUD(congeladoresController));
        router.use("/api/gateways", crearRouterCRUD(new GatewaysController()));
        router.use("/api/dispositivos", QueryDispositivosMiddleware.execute, crearRouterCRUD(new DispositivosController()));

        // [legacy] GET y PATCH de data protegidos — pendiente de migrar
        router.use("/api/data", crearRouterCRUD(dataController));
        router.use("/api/info-estatus", crearRouterCRUD(new InfoEstatusController()));

        return router;
    }
}
