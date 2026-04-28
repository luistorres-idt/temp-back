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
        idDispositivo: number;
        bateria: number;
        rssi: number;
        snr: number;
        idGateway: number;
    }): Promise<ResultadoIngesta> {
        const dataRegistro = await this.db.data.create({
            data: {
                temperatura: params.temperatura,
                ambiente: params.ambiente,
                idDispositivo: params.idDispositivo,
            },
        });

        const infoEstatusRegistro = await this.db.infoEstatus.create({
            data: {
                bateria: params.bateria,
                rssi: params.rssi,
                snr: params.snr,
                idGateway: params.idGateway,
                idDispositivo: params.idDispositivo,
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
