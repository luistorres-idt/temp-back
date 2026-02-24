import { BaseController } from "./base.js";
import { evaluarData, evaluarDataParcial } from "../schemas/data.js";
import { DataModel } from "../models/data.js";

export class DataController extends BaseController {
    constructor() {
        super({
            model: DataModel,
            evaluarCreacion: evaluarData,
            evaluarEdicion: evaluarDataParcial,
        });
    }
}
