import { BaseController } from "./base.js";
import { evaluarModulo, evaluarModuloParcial } from "../schemas/modulos.js";
import { ModuloModel } from "../models/modulos.js";

export class ModulosController extends BaseController {
    constructor() {
        super({
            model: ModuloModel,
            evaluarCreacion: evaluarModulo,
            evaluarEdicion: evaluarModuloParcial,
        });
    }
}
