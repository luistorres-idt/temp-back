import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { perfilSelect } from "../schemas/perfiles.js";
import type { PerfilResponse, PerfilInput, PerfilInputParcial } from "../types/perfiles.js";

export const PerfilModel = new BaseRepository<PerfilResponse, PerfilInput, PerfilInputParcial>(
    prisma.perfil,
    perfilSelect,
);
