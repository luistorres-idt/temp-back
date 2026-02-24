import { Router } from "express";
import { AutenticacionController } from "../controllers/autenticacion.js";

export const crearRouterAutenticacion = (): Router => {
    const router = Router();

    router.post("/login", AutenticacionController.login);

    return router;
};
