// ─── Stored summary (sucursal level) ─────────────────────────────────────────
export interface ResumenDiarioResponse {
    id: number;
    fecha: Date;
    tempMax: number;
    tempMin: number;
    tempMedia: number;
    tempMediana: number;
    totalLecturas: number;
    sucursal: { id: number; nombre: string };
}

// ─── Report: Resumen sheet (per-congelador, per-day) ─────────────────────────
export interface DiaResumen {
    fecha: Date;
    tempMaxMediana: number;
    tempMaxMedia: number;
    tempMinMediana: number;
    tempMinMedia: number;
    tempMedia: number;
    tempMediana: number;
    totalLecturas: number;
}

export interface CongeladorResumen {
    id: number;
    nombre: string;
    dias: DiaResumen[];
}

export interface SeccionResumen {
    id: number;
    nombre: string;
    congeladores: CongeladorResumen[];
}

// ─── Report: Datos sheet (per-sensor, per-minute) ────────────────────────────
export interface SensorDatos {
    id: number;
    nombre: string;
    lecturas: Map<string, number>; // "HH:MM" → temperatura promedio del minuto
}

export interface CongeladorDatos {
    id: number;
    nombre: string;
    sensores: SensorDatos[];
}

export interface SeccionDatos {
    id: number;
    nombre: string;
    congeladores: CongeladorDatos[];
}
