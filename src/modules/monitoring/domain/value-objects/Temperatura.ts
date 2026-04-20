import { ValueObject } from "../../../../shared/domain/ValueObject.js";
import { DomainError } from "../../../../shared/domain/DomainError.js";

interface TemperaturaProps {
    valor: number;
}

/**
 * Value Object que representa una lectura de temperatura.
 * Encapsula la validacion de rango y precision.
 */
export class Temperatura extends ValueObject<TemperaturaProps> {
    private static readonly MIN = -80;
    private static readonly MAX = 60;

    private constructor(props: TemperaturaProps) {
        super(props);
    }

    static create(valor: number): Temperatura {
        if (valor < Temperatura.MIN || valor > Temperatura.MAX) {
            throw new DomainError(
                "TEMPERATURA_FUERA_DE_RANGO",
                `La temperatura ${valor} esta fuera del rango permitido [${Temperatura.MIN}, ${Temperatura.MAX}]`,
            );
        }
        return new Temperatura({ valor });
    }

    get valor(): number {
        return this.props.valor;
    }
}
