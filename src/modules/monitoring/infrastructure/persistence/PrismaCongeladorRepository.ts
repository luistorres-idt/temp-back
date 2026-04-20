import { prisma } from "../../../../config/db.js";
import { EntityNotFoundError } from "../../../../shared/domain/DomainError.js";
import { congeladorDetalleSelect } from "../../../../schemas/congeladores.js";
import type {
    ICongeladorRepository,
    ModoTelemetria,
    DatosTelemetria,
    DispositivoConLecturas,
    LecturaDispositivo,
} from "../../domain/repositories.js";

const LECTURAS_EN_VIVO = 1;
const MS_24H = 24 * 60 * 60 * 1000;

/**
 * Adaptador Prisma para ICongeladorRepository.
 *
 * Migra la logica de CongeladorRepository.obtenerTelemetria()
 * y CongeladorRepository.#getLecturasDispositivo() al nuevo
 * patron de puertos/adaptadores.
 */
export class PrismaCongeladorRepository implements ICongeladorRepository {
    async obtenerTelemetria(id: number, modo: ModoTelemetria): Promise<DatosTelemetria> {
        const congelador = await prisma.congelador.findFirst({
            where: { id, estatus: true },
            select: congeladorDetalleSelect,
        });

        if (!congelador) {
            throw new EntityNotFoundError("Congelador", id);
        }

        const dispositivos: DispositivoConLecturas[] = await Promise.all(
            congelador.dispositivos.map((dispositivo) =>
                this.getLecturasDispositivo(dispositivo.id, dispositivo.nombre, modo),
            ),
        );

        return {
            congelador: {
                id: congelador.id,
                nombre: congelador.nombre,
                temperaturaObjetivo: congelador.temperaturaObjetivo,
                seccion: congelador.seccion,
            },
            dispositivos,
            modo,
        };
    }

    private async getLecturasDispositivo(
        idDispositivo: number,
        nombreDispositivo: string,
        modo: ModoTelemetria,
    ): Promise<DispositivoConLecturas> {
        const select = { temperatura: true, ambiente: true, creado: true } as const;
        const whereBase = { idDispositivo, estatus: true };

        let lecturas: LecturaDispositivo[];

        if (modo === "historico") {
            const hace24h = new Date(Date.now() - MS_24H);
            lecturas = await prisma.data.findMany({
                where: { ...whereBase, creado: { gte: hace24h } },
                orderBy: { creado: "asc" },
                select,
            });
        } else {
            const recientes = await prisma.data.findMany({
                where: whereBase,
                orderBy: { creado: "desc" },
                take: LECTURAS_EN_VIVO,
                select,
            });
            lecturas = recientes.reverse();
        }

        return { id: idDispositivo, nombre: nombreDispositivo, lecturas };
    }
}
