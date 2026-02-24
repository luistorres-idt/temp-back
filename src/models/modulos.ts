import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { moduloSelect } from "../schemas/modulos.js";
import type { ModuloResponse, ModuloInput, ModuloInputParcial } from "../types/modulos.js";

export const ModuloModel = new BaseRepository<ModuloResponse, ModuloInput, ModuloInputParcial>(
    prisma.modulo,
    moduloSelect,
);
