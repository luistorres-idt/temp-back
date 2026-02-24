import { Router } from "express";
import { BaseController } from "../controllers/base.js";

// Función genérica para crear rutas CRUD básicas
export const crearRouterCRUD = (controller: BaseController): Router => {
    const router = Router();

    router.get("/", controller.obtenerElementos);
    router.post("/", controller.crearElemento);
    router.get("/:id", controller.obtenerElemento);
    router.patch("/:id", controller.editarElemento);

    return router;
};
