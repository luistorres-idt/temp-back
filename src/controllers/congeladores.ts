import { BaseController } from "./base.js";
import { evaluarCongelador, evaluarCongeladorParcial } from "../schemas/congeladores.js";
import { CongeladorModel } from "../models/congeladores.js";

export class CongeladoresController extends BaseController {
    constructor() {
        super({
            model: CongeladorModel,
            evaluarCreacion: evaluarCongelador,
            evaluarEdicion: evaluarCongeladorParcial,
        });
    }
}
