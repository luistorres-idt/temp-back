import { BaseController } from "./base.js";
import { evaluarInfoEstatus, evaluarInfoEstatusParcial } from "../schemas/infoEstatus.js";
import { InfoEstatusModel } from "../models/infoEstatus.js";

export class InfoEstatusController extends BaseController {
    constructor() {
        super({
            model: InfoEstatusModel,
            evaluarCreacion: evaluarInfoEstatus,
            evaluarEdicion: evaluarInfoEstatusParcial,
        });
    }
}
