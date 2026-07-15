import crypto from "crypto";
import { prisma } from "../../../../config/db.js";
import { EntityNotFoundError } from "../../../../shared/domain/DomainError.js";
import type {
    IDataRepository,
    ResultadoIngesta,
} from "../../domain/repositories.js";

/**
 * Adaptador Prisma para IDataRepository.
 *
 * Implementa las operaciones de persistencia de datos de telemetria
 * usando Prisma como ORM. La capa de dominio/aplicacion depende solo
 * de la interfaz IDataRepository, no de esta implementacion concreta.
 */
export class PrismaDataRepository implements IDataRepository {
    constructor(
        private readonly db: typeof prisma = prisma,
    ) { }

    async buscarGatewayPorIdentificador(identificador: string) {
        return this.db.gateway.findFirst({
            where: { identificador, estatus: true },
            select: { id: true },
        });
    }

    async buscarDispositivoPorIdentificadorYGateway(identificador: string, idGateway: number) {
        return this.db.dispositivo.findFirst({
            where: {
                identificador,
                idGateway,
                estatus: true,
            },
            select: {
                id: true,
                nombre: true,
                idCongelador: true,
                congelador: {
                    select: {
                        id: true,
                        seccion: {
                            select: {
                                sucursal: { select: { id: true } },
                            },
                        },
                    },
                },
            },
        });
    }

    async persistirLectura(params: {
        temperatura: number;
        ambiente: number;
        humedad?: number | null;
        idDispositivo: number;
        bateria: number;
        rssi: number;
        snr: number;
        idGateway: number;
        firmaGateway?: string;
    }): Promise<ResultadoIngesta> {
        // 1. Obtener el último registro de telemetría de este dispositivo para extraer el prevHash
        const ultimoRegistro = await this.db.data.findFirst({
            where: { idDispositivo: params.idDispositivo },
            orderBy: { creado: "desc" },
            select: { hash: true },
        });

        const prevHash = ultimoRegistro?.hash || ""; // Cadena vacía para el primer bloque (bloque génesis)

        // 2. Generar el timestamp exacto del registro para que coincida con el hash
        const creado = new Date();
        const creadoIso = creado.toISOString();
        const humedadVal = params.humedad ?? null;
        const humedadStr = humedadVal !== null ? humedadVal.toString() : "null";

        // Formato del string para hashear: temperatura|ambiente|humedad|creadoIso|prevHash
        const dataString = `${params.temperatura}|${params.ambiente}|${humedadStr}|${creadoIso}|${prevHash}`;

        // 3. Calcular el hash SHA-256
        const hash = crypto
            .createHash("sha256")
            .update(dataString)
            .digest("hex");

        const dataRegistro = await this.db.data.create({
            data: {
                temperatura: params.temperatura,
                ambiente: params.ambiente,
                humedad: humedadVal,
                idDispositivo: params.idDispositivo,
                creado, // Forzar la fecha exacta que hasheamos
                firmaGateway: params.firmaGateway ?? null,
                hash,
                prevHash,
            },
        });

        const infoEstatusRegistro = await this.db.infoEstatus.create({
            data: {
                bateria: params.bateria,
                rssi: params.rssi,
                snr: params.snr,
                idGateway: params.idGateway,
                idDispositivo: params.idDispositivo,
                creado,
            },
        });

        return {
            data: dataRegistro as ResultadoIngesta["data"],
            infoEstatus: infoEstatusRegistro as ResultadoIngesta["infoEstatus"],
        };
    }

    async ejecutarEnTransaccion<T>(fn: (repo: IDataRepository) => Promise<T>): Promise<T> {
        return this.db.$transaction(async (tx) => {
            const txRepo = new PrismaDataRepository(tx as typeof prisma);
            return fn(txRepo);
        });
    }
}
