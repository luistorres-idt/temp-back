import { BaseController } from "./base.js";
import { evaluarPerfil, evaluarPerfilParcial } from "../schemas/perfiles.js";
import { PerfilModel } from "../models/perfiles.js";

export class PerfilesController extends BaseController {
    constructor() {
        super({
            model: PerfilModel,
            evaluarCreacion: evaluarPerfil,
            evaluarEdicion: evaluarPerfilParcial,
        });
    }
}
