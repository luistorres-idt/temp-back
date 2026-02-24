import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { gatewaySelect } from "../schemas/gateways.js";
import type { GatewayResponse, GatewayInput, GatewayInputParcial } from "../types/gateways.js";

export const GatewayModel = new BaseRepository<GatewayResponse, GatewayInput, GatewayInputParcial>(
    prisma.gateway,
    gatewaySelect,
);
