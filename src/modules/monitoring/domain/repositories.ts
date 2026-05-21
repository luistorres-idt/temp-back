import type { DomainEvent } from "../../../shared/domain/DomainEvent.js";

/**
 * Interfaz para datos que provienen de un sensor individual
 * en el payload de ingesta.
 */
export interface DatosSensor {
    identificador: string;
    signal: {
        bateria: number;
        rssi: number;
        snr?: number | null;
    };
    data: {
        temperatura: number;
        ambiente?: number | null;
        humedad?: number | null;
    };
}

/**
 * Comando de ingesta: datos raw que llegan del gateway IoT.
 */
export interface ComandoIngesta {
    identificadorGateway: string;
    sensores: DatosSensor[];
}

/**
 * Resultado de la ingesta de un sensor individual.
 */
export interface ResultadoIngesta {
    data: { id: number; temperatura: number; ambiente: number; humedad: number | null; creado: Date };
    infoEstatus: { id: number; bateria: number; rssi: number; snr: number; creado: Date };
}

/**
 * Puerto de persistencia para la ingesta de datos de telemetria.
 *
 * Abstrae las operaciones de persistencia necesarias para el caso de uso
 * IngerirDatosSensor, permitiendo desacoplar el dominio del ORM.
 */
export interface IDataRepository {
    /**
     * Busca un gateway activo por su identificador unico.
     * Retorna null si no existe.
     */
    buscarGatewayPorIdentificador(identificador: string): Promise<{ id: number } | null>;

    /**
     * Busca un dispositivo activo por su identificador (MAC address) e id de gateway.
     * Incluye las relaciones necesarias para resolver el room de WebSocket.
     */
    buscarDispositivoPorIdentificadorYGateway(
        identificador: string,
        idGateway: number,
    ): Promise<{
        id: number;
        nombre: string;
        idCongelador: number;
        congelador: {
            id: number;
            seccion: {
                sucursal: { id: number };
            };
        };
    } | null>;

    /**
     * Persiste los datos de telemetria y la info de estatus de un sensor
     * dentro de una transaccion. Retorna los registros creados y los
     * eventos de dominio a publicar.
     */
    persistirLectura(params: {
        temperatura: number;
        ambiente: number;
        humedad?: number | null;
        idDispositivo: number;
        bateria: number;
        rssi: number;
        snr: number;
        idGateway: number;
    }): Promise<ResultadoIngesta>;

    /**
     * Ejecuta un bloque de operaciones dentro de una transaccion.
     * Si alguna operacion falla, todas se revierten.
     */
    ejecutarEnTransaccion<T>(fn: (repo: IDataRepository) => Promise<T>): Promise<T>;
}

/**
 * Puerto de lectura para telemetria de congeladores.
 */
export type ModoTelemetria = "vivo" | "historico";

export interface LecturaDispositivo {
    temperatura: number;
    ambiente: number;
    humedad: number | null;
    creado: Date;
}

export interface DispositivoConLecturas {
    id: number;
    nombre: string;
    lecturas: LecturaDispositivo[];
}

export interface DatosTelemetria {
    congelador: {
        id: number;
        nombre: string;
        temperaturaObjetivo: number;
        seccion: {
            id: number;
            nombre: string;
            sucursal: { id: number; nombre: string };
        };
    };
    dispositivos: DispositivoConLecturas[];
    modo: ModoTelemetria;
}

export interface ICongeladorRepository {
    /**
     * Obtiene la telemetria de un congelador: sus dispositivos con lecturas
     * segun el modo (vivo = ultima lectura, historico = ultimas 24h o rango).
     *
     * @throws EntityNotFoundError si el congelador no existe.
     */
    obtenerTelemetria(id: number, modo: ModoTelemetria, fechaInicio?: Date, fechaFin?: Date): Promise<DatosTelemetria>;
}

/**
 * Datos de un dispositivo con lecturas y estatus,
 * tal como los devuelve la consulta de secciones.
 */
export interface DispositivoConData {
    id: number;
    nombre: string;
    data: { temperatura: number; ambiente: number; humedad: number | null; creado: Date }[];
    infoEstatus: { bateria: number; rssi: number; snr: number; creado: Date }[];
}

export interface CongeladorConDispositivos {
    id: number;
    nombre: string;
    temperaturaObjetivo: number;
    dispositivos: DispositivoConData[];
    // Campos calculados
    temperaturaPromedio?: number | null;
    ambientePromedio?: number | null;
    ultimaLectura?: Date | null;
    dispositivosActivos?: number;
    dispositivosTotales?: number;
}

export interface SeccionConCongeladores {
    id: number;
    nombre: string;
    estatus: boolean;
    creado: Date;
    sucursal: { id: number; nombre: string };
    congeladores?: CongeladorConDispositivos[];
}
