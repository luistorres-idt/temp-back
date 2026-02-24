import { BaseController } from "./base.js";
import { evaluarSucursal, evaluarSucursalParcial } from "../schemas/sucursales.js";
import { SucursalModel } from "../models/sucursales.js";

export class SucursalesController extends BaseController {
    constructor() {
        super({
            model: SucursalModel,
            evaluarCreacion: evaluarSucursal,
            evaluarEdicion: evaluarSucursalParcial,
        });
    }
}
