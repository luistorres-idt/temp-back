import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { infoEstatusSelect } from "../schemas/infoEstatus.js";
import type { InfoEstatusResponse, InfoEstatusInput, InfoEstatusInputParcial } from "../types/infoEstatus.js";

export const InfoEstatusModel = new BaseRepository<InfoEstatusResponse, InfoEstatusInput, InfoEstatusInputParcial>(
    prisma.infoEstatus,
    infoEstatusSelect,
);
