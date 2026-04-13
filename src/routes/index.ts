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

export class AppRouter {
    static get routes(): Router {
        const router = Router();

        // Rutas públicas
        router.use("/api/autenticacion", crearRouterAutenticacion());

        // Rutas CRUD protegidas
        router.use("/api/acciones", crearRouterCRUD(new AccionesController()));
        router.use("/api/modulos", crearRouterCRUD(new ModulosController()));
        router.use("/api/operaciones", crearRouterCRUD(new OperacionesController()));
        router.use("/api/perfiles", crearRouterCRUD(new PerfilesController()));
        router.use("/api/usuarios", crearRouterCRUD(new UsuariosController()));
        router.use("/api/clientes", crearRouterCRUD(new ClientesController()));
        router.use("/api/sucursales", crearRouterCRUD(new SucursalesController()));
        router.use("/api/secciones", crearRouterCRUD(new SeccionesController()));

        // Ruta especial de telemetria del congelador — debe ir antes del CRUD
        const congeladoresController = new CongeladoresController();
        router.get("/api/congeladores/:id/telemetria", congeladoresController.obtenerTelemetria);
        router.use("/api/congeladores", crearRouterCRUD(congeladoresController));
        router.use("/api/gateways", crearRouterCRUD(new GatewaysController()));
        router.use("/api/dispositivos", crearRouterCRUD(new DispositivosController()));
        router.use("/api/data", crearRouterCRUD(new DataController()));
        router.use("/api/info-estatus", crearRouterCRUD(new InfoEstatusController()));

        return router;
    }
}
