import { BaseController } from "./base.js";
import { evaluarSeccion, evaluarSeccionParcial } from "../schemas/secciones.js";
import { SeccionModel } from "../models/secciones.js";

export class SeccionesController extends BaseController {
    constructor() {
        super({
            model: SeccionModel,
            evaluarCreacion: evaluarSeccion,
            evaluarEdicion: evaluarSeccionParcial,
        });
    }
}
