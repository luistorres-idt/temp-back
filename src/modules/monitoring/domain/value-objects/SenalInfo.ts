import { ValueObject } from "../../../../shared/domain/ValueObject.js";

interface SenalInfoProps {
    bateria: number;
    rssi: number;
    snr: number;
}

/**
 * Value Object que representa la informacion de senal de un dispositivo IoT.
 * Agrupa bateria, RSSI y SNR como una unidad conceptual.
 */
export class SenalInfo extends ValueObject<SenalInfoProps> {
    private constructor(props: SenalInfoProps) {
        super(props);
    }

    static create(bateria: number, rssi: number, snr: number): SenalInfo {
        return new SenalInfo({ bateria, rssi, snr });
    }

    get bateria(): number { return this.props.bateria; }
    get rssi(): number { return this.props.rssi; }
    get snr(): number { return this.props.snr; }
}
