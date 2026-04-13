import { prisma } from "../config/db.js";
import { BaseRepository } from "./BaseRepository.js";
import { congeladorSelect, congeladorDetalleSelect } from "../schemas/congeladores.js";
import type {
    CongeladorResponse,
    CongeladorInput,
    CongeladorInputParcial,
    ModoTelemetria,
    TelemetriaResponse,
    DispositivoConLecturas,
} from "../types/congeladores.js";

const LECTURAS_EN_VIVO = 1;
const MS_24H = 24 * 60 * 60 * 1000;

class CongeladorRepository extends BaseRepository<CongeladorResponse, CongeladorInput, CongeladorInputParcial> {
    constructor() {
        super(prisma.congelador, congeladorSelect);
    }

    /**
     * Busca el congelador y devuelve sus lecturas agrupadas por dispositivo.
     * Delega la seleccion de query al metodo privado segun el modo.
     *
     * @throws {Error} Si el congelador no existe o esta inactivo.
     */
    async obtenerTelemetria(id: number, modo: ModoTelemetria): Promise<TelemetriaResponse> {
        const congelador = await prisma.congelador.findFirst({
            where: { id, estatus: true },
            select: congeladorDetalleSelect,
        });

        if (!congelador) {
            throw new Error("CONGELADOR_NO_ENCONTRADO");
        }

        const dispositivos: DispositivoConLecturas[] = await Promise.all(
            congelador.dispositivos.map((dispositivo) =>
                this.#getLecturasDispositivo(dispositivo.id, dispositivo.nombre, modo)
            )
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

    /**
     * Ejecuta la query correcta segun el modo y devuelve el dispositivo con sus lecturas.
     */
    async #getLecturasDispositivo(
        idDispositivo: number,
        nombreDispositivo: string,
        modo: ModoTelemetria,
    ): Promise<DispositivoConLecturas> {
        const select = { temperatura: true, ambiente: true, creado: true } as const;
        const whereBase = { idDispositivo, estatus: true };

        let lecturas;

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

export const CongeladorModel = new CongeladorRepository();
