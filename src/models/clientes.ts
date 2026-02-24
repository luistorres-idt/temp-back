import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { clienteSelect } from "../schemas/clientes.js";
import type { ClienteResponse, ClienteInput, ClienteInputParcial } from "../types/clientes.js";

export const ClienteModel = new BaseRepository<ClienteResponse, ClienteInput, ClienteInputParcial>(
    prisma.cliente,
    clienteSelect,
);
