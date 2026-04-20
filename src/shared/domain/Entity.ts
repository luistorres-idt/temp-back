/**
 * Clase base abstracta para Entidades del dominio.
 *
 * Una Entidad tiene identidad unica (id) y se compara por identidad,
 * no por atributos. Dos entidades con el mismo id son la misma entidad
 * aunque sus demas atributos difieran.
 *
 * @template TId - Tipo del identificador (default: number, compatible con Prisma autoincrement).
 */
export abstract class Entity<TId = number> {
    constructor(
        protected readonly _id: TId,
    ) { }

    get id(): TId {
        return this._id;
    }

    /**
     * Compara dos entidades por identidad.
     */
    equals(other: Entity<TId> | null | undefined): boolean {
        if (other === null || other === undefined) return false;
        if (!(other instanceof Entity)) return false;
        return this._id === other._id;
    }
}
