import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { dispositivoSelect } from "../schemas/dispositivos.js";
import type { DispositivoResponse, DispositivoInput, DispositivoInputParcial } from "../types/dispositivos.js";

export const DispositivoModel = new BaseRepository<DispositivoResponse, DispositivoInput, DispositivoInputParcial>(
    prisma.dispositivo,
    dispositivoSelect,
);
