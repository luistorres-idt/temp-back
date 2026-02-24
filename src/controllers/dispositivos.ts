import { BaseController } from "./base.js";
import { evaluarDispositivo, evaluarDispositivoParcial } from "../schemas/dispositivos.js";
import { DispositivoModel } from "../models/dispositivos.js";

export class DispositivosController extends BaseController {
    constructor() {
        super({
            model: DispositivoModel,
            evaluarCreacion: evaluarDispositivo,
            evaluarEdicion: evaluarDispositivoParcial,
        });
    }
}
