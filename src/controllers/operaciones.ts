import { BaseController } from "./base.js";
import { evaluarOperacion, evaluarOperacionParcial } from "../schemas/operaciones.js";
import { OperacionModel } from "../models/operaciones.js";

export class OperacionesController extends BaseController {
    constructor() {
        super({
            model: OperacionModel,
            evaluarCreacion: evaluarOperacion,
            evaluarEdicion: evaluarOperacionParcial,
        });
    }
}
