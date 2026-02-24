import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { operacionSelect } from "../schemas/operaciones.js";
import type { OperacionResponse, OperacionInput, OperacionInputParcial } from "../types/operaciones.js";

export const OperacionModel = new BaseRepository<OperacionResponse, OperacionInput, OperacionInputParcial>(
    prisma.operacion,
    operacionSelect,
);
