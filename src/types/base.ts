/** Tipo genérico para condiciones where de Prisma */
export type PrismaWhereInput = Record<string, unknown>;

/** Respuesta genérica de un listado paginado */
export interface ObtenerElementosResponse<T> {
    numElementos: number;
    elementos: T[];
}
