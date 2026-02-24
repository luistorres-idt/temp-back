import { BaseController } from "./base.js";
import { evaluarAccion, evaluarAccionParcial } from "../schemas/acciones.js";
import { AccionModel } from "../models/acciones.js";

export class AccionesController extends BaseController {
    constructor() {
        super({
            model: AccionModel,
            evaluarCreacion: evaluarAccion,
            evaluarEdicion: evaluarAccionParcial,
        });
    }
}
