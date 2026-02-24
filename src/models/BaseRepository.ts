import type { PrismaWhereInput, ObtenerElementosResponse } from "../types/base.js";

/**
 * Interface mínima para delegates de Prisma.
 * Se utiliza 'any' intencionalmente en la frontera con el ORM
 * para compatibilidad genérica con los delegates generados por Prisma.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
interface PrismaDelegate {
    count(args?: any): Promise<number>;
    findMany(args?: any): Promise<any[]>;
    findFirst(args?: any): Promise<any>;
    findFirstOrThrow(args?: any): Promise<any>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Repositorio base genérico que elimina la duplicación CRUD de los modelos.
 * Usa Promise.all para optimizar las consultas count + findMany.
 *
 * @template TResponse - Tipo de la respuesta de la entidad
 * @template TInput - Tipo de entrada para crear una entidad
 * @template TInputParcial - Tipo parcial para editar una entidad
 */
export class BaseRepository<TResponse, TInput, TInputParcial = Partial<TInput>> {
    constructor(
        protected readonly delegate: PrismaDelegate,
        protected readonly selectSchema: object,
    ) { }

    async obtenerElementos({ skip, take, where }: {
        skip?: number;
        take?: number;
        where?: PrismaWhereInput;
    }): Promise<ObtenerElementosResponse<TResponse>> {
        const [numElementos, elementos] = await Promise.all([
            this.delegate.count({ where }),
            this.delegate.findMany({
                skip,
                take,
                where,
                orderBy: [{ creado: "desc" }],
                select: this.selectSchema,
            }),
        ]);
        return { numElementos, elementos: elementos as TResponse[] };
    }

    async crearElemento({ data }: { data: TInput }): Promise<TResponse> {
        const elemento = await this.delegate.create({
            data,
            select: this.selectSchema,
        });
        return elemento as TResponse;
    }

    async obtenerElemento({ id }: { id: number }): Promise<TResponse> {
        const elemento = await this.delegate.findFirstOrThrow({
            where: { id, estatus: true },
            select: this.selectSchema,
        });
        return elemento as TResponse;
    }

    async editarElemento({ id, data }: { id: number; data: TInputParcial }): Promise<TResponse> {
        const elemento = await this.delegate.update({
            where: { id },
            data,
            select: this.selectSchema,
        });
        return elemento as TResponse;
    }
}
