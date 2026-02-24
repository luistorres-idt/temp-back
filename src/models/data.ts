import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { dataSelect } from "../schemas/data.js";
import type { DataResponse, DataInput, DataInputParcial } from "../types/data.js";

export const DataModel = new BaseRepository<DataResponse, DataInput, DataInputParcial>(
    prisma.data,
    dataSelect,
);
