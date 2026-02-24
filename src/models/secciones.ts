import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { seccionSelect } from "../schemas/secciones.js";
import type { SeccionResponse, SeccionInput, SeccionInputParcial } from "../types/secciones.js";

export const SeccionModel = new BaseRepository<SeccionResponse, SeccionInput, SeccionInputParcial>(
    prisma.seccion,
    seccionSelect,
);
