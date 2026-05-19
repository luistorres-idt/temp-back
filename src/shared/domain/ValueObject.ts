/**
 * Clase base abstracta para Value Objects.
 *
 * Un Value Object es un objeto inmutable que se define por sus atributos,
 * no por una identidad. Dos Value Objects con los mismos atributos son iguales.
 *
 * @template T - Tipo de las propiedades del Value Object.
 *
 * @example
 * ```ts
 * class Temperatura extends ValueObject<{ valor: number }> {
 *     static create(valor: number): Temperatura {
 *         if (valor < -80 || valor > 60) {
 *             throw new DomainError("TEMPERATURA_INVALIDA", "Fuera de rango");
 *         }
 *         return new Temperatura({ valor });
 *     }
 *
 *     get valor(): number { return this.props.valor; }
 * }
 * ```
 */
export abstract class ValueObject<T extends object> {
    protected readonly props: Readonly<T>;

    protected constructor(props: T) {
        this.props = Object.freeze({ ...props });
    }

    /**
     * Compara este Value Object con otro por valor (deep equality de props).
     */
    equals(other: ValueObject<T> | null | undefined): boolean {
        if (other === null || other === undefined) return false;
        if (other.constructor !== this.constructor) return false;

        const thisKeys = Object.keys(this.props) as (keyof T)[];
        const otherKeys = Object.keys(other.props) as (keyof T)[];

        if (thisKeys.length !== otherKeys.length) return false;

        return thisKeys.every((key) => this.props[key] === other.props[key]);
    }
}
