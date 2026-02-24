import { BaseController } from "./base.js";
import { evaluarCliente, evaluarClienteParcial } from "../schemas/clientes.js";
import { ClienteModel } from "../models/clientes.js";

export class ClientesController extends BaseController {
    constructor() {
        super({
            model: ClienteModel,
            evaluarCreacion: evaluarCliente,
            evaluarEdicion: evaluarClienteParcial,
        });
    }
}
