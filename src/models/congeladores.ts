import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { congeladorSelect } from "../schemas/congeladores.js";
import type { CongeladorResponse, CongeladorInput, CongeladorInputParcial } from "../types/congeladores.js";

export const CongeladorModel = new BaseRepository<CongeladorResponse, CongeladorInput, CongeladorInputParcial>(
    prisma.congelador,
    congeladorSelect,
);
