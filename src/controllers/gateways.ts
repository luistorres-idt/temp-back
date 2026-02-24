import { BaseController } from "./base.js";
import { evaluarGateway, evaluarGatewayParcial } from "../schemas/gateways.js";
import { GatewayModel } from "../models/gateways.js";

export class GatewaysController extends BaseController {
    constructor() {
        super({
            model: GatewayModel,
            evaluarCreacion: evaluarGateway,
            evaluarEdicion: evaluarGatewayParcial,
        });
    }
}
