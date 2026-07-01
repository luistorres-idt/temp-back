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
import { PermisosController } from "../controllers/permisos.js";
// [DDD] Bounded Context: Monitoring
import { DataControllerV2 } from "../modules/monitoring/infrastructure/http/DataControllerV2.js";
import { CongeladoresControllerV2 } from "../modules/monitoring/infrastructure/http/CongeladoresControllerV2.js";
import { TelemetriaStreamController } from "../modules/monitoring/infrastructure/http/TelemetriaStreamController.js";
import { ReportesController } from "../controllers/reportes.js";
import { AutenticacionMiddleware } from "../middlewares/autenticacion/autenticacion.js";
import { AutorizacionMiddleware } from "../middlewares/autorizacion/autorizacion.js";
import { autenticarGateway } from "../middlewares/autenticacion/autenticacionGateway.js";
import {
    QueryClientesMiddleware,
    QuerySucursalesMiddleware,
    QuerySeccionesMiddleware,
    QueryCongeladoresMiddleware,
    QueryDispositivosMiddleware,
    QueryUsuariosMiddleware,
    QueryGatewaysMiddleware,
} from "../middlewares/query.js";

export class AppRouter {
    static get routes(): Router {
        const router = Router();

        // ----------------------------------------------------------------
        // Rutas PÚBLICAS — no requieren autenticación
        // Definidas antes del middleware de auth global de app.ts
        // ----------------------------------------------------------------
        router.use("/api/autenticacion", crearRouterAutenticacion());


        // Ingesta de data desde dispositivos IoT (autenticado por API Key de Gateway)
        // [DDD] Usando DataControllerV2 — logica extraida a IngerirDatosSensor use case
        const dataControllerV2 = new DataControllerV2();
        router.post("/api/data", dataControllerV2.crearElemento);

        // [legacy] dataController para GET/PATCH de data protegidos — se migrara en fase siguiente
        const dataController = new DataController();

        // ----------------------------------------------------------------
        // Middleware de autenticación — protege todo lo que viene después
        // ----------------------------------------------------------------
        router.use(AutenticacionMiddleware.execute);
        //router.use(AutorizacionMiddleware.execute);

        // ----------------------------------------------------------------
        // Rutas PROTEGIDAS con scoping por perfil de usuario
        // ----------------------------------------------------------------
        router.use("/api/acciones", crearRouterCRUD(new AccionesController()));
        router.use("/api/modulos", crearRouterCRUD(new ModulosController()));
        router.use("/api/operaciones", crearRouterCRUD(new OperacionesController()));
        router.use("/api/perfiles", crearRouterCRUD(new PerfilesController()));
        const permisosController = new PermisosController();
        router.get("/api/permisos", permisosController.obtenerPermisosPerfil);
        router.post("/api/permisos", permisosController.guardarPermisosPerfil);
        router.use("/api/usuarios", QueryUsuariosMiddleware.execute, crearRouterCRUD(new UsuariosController()));
        router.use("/api/clientes", QueryClientesMiddleware.execute, crearRouterCRUD(new ClientesController()));
        router.use("/api/sucursales", QuerySucursalesMiddleware.execute, crearRouterCRUD(new SucursalesController()));
        router.use("/api/secciones", QuerySeccionesMiddleware.execute, crearRouterCRUD(new SeccionesController()));

        // [DDD] Usando CongeladoresControllerV2 — logica extraida a ObtenerTelemetria use case
        const congeladoresControllerV2 = new CongeladoresControllerV2();
        router.get("/api/congeladores/:id/telemetria", congeladoresControllerV2.obtenerTelemetria);
        
        // Canal de Server-Sent Events (SSE) en vivo para telemetría
        router.get("/api/monitoring/telemetria/stream", TelemetriaStreamController.stream);

        // [legacy] CRUD de congeladores aun usa el controller anterior
        const congeladoresController = new CongeladoresController();
        router.use("/api/congeladores", QueryCongeladoresMiddleware.execute, crearRouterCRUD(congeladoresController));
        const gatewaysController = new GatewaysController();
        router.post("/api/gateways/:id/token", gatewaysController.generarToken);
        router.delete("/api/gateways/:id/token", gatewaysController.eliminarToken);
        router.use("/api/gateways", QueryGatewaysMiddleware.execute, crearRouterCRUD(gatewaysController));
        router.use("/api/dispositivos", QueryDispositivosMiddleware.execute, crearRouterCRUD(new DispositivosController()));

        // [legacy] GET y PATCH de data protegidos — pendiente de migrar
        router.use("/api/data", crearRouterCRUD(dataController));
        router.use("/api/info-estatus", crearRouterCRUD(new InfoEstatusController()));

        // Reportes: resumen diario + exportación Excel por sucursal
        const reportesController = new ReportesController();
        router.post("/api/reportes/sucursales/:id/calcular", reportesController.calcularResumen);
        router.get("/api/reportes/sucursales/:id/excel", reportesController.generarExcel);

        return router;
    }
}
