import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { sucursalSelect } from "../schemas/sucursales.js";
import type { SucursalResponse, SucursalInput, SucursalInputParcial } from "../types/sucursales.js";

export const SucursalModel = new BaseRepository<SucursalResponse, SucursalInput, SucursalInputParcial>(
    prisma.sucursal,
    sucursalSelect,
);
