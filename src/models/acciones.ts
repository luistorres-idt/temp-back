import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { accionSelect } from "../schemas/acciones.js";
import type { AccionResponse, AccionInput, AccionInputParcial } from "../types/acciones.js";

export const AccionModel = new BaseRepository<AccionResponse, AccionInput, AccionInputParcial>(
    prisma.accion,
    accionSelect,
);
