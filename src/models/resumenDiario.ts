import { prisma } from "../config/db.js";
import { resumenDiarioSelect } from "../schemas/resumenDiario.js";
import type {
    ResumenDiarioResponse,
    SeccionResumen,
    SeccionDatos,
    SensorDatos,
} from "../types/resumenDiario.js";

// ─── Utilidades internas (exportadas para testing) ───────────────────────────

export function calcularMediana(valores: number[]): number {
    if (valores.length === 0) return 0;
    const sorted = [...valores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

export function redondear2(n: number): number {
    return Math.round(n * 100) / 100;
}

export function parsearFecha(fecha: string): { inicio: Date; fin: Date } {
    const [year, month, day] = fecha.split("-").map(Number);
    if (!year || !month || !day) throw new Error(`Fecha inválida: ${fecha}`);
    return {
        inicio: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)),
        fin: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)),
    };
}

export function toFechaKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function toTimeKey(date: Date, timezone?: string): string {
    if (!timezone) {
        return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
    }
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const hour   = partes.find((p) => p.type === "hour")?.value   ?? "00";
    const minute = partes.find((p) => p.type === "minute")?.value ?? "00";
    const h = parseInt(hour, 10) % 24;
    return `${String(h).padStart(2, "0")}:${minute}`;
}

// ─── Repositorio ──────────────────────────────────────────────────────────────

export const ResumenDiarioModel = {
    // Calcula y persiste el resumen diario a nivel sucursal (endpoint /calcular)
    async calcularYGuardar({
        idSucursal,
        fecha,
    }: {
        idSucursal: number;
        fecha: string;
    }): Promise<ResumenDiarioResponse> {
        const { inicio, fin } = parsearFecha(fecha);

        const datos = await prisma.data.findMany({
            where: {
                creado: { gte: inicio, lte: fin },
                dispositivo: {
                    congelador: { seccion: { sucursal: { id: idSucursal } } },
                },
            },
            select: { temperatura: true },
        });

        if (datos.length === 0) throw new Error("SIN_DATOS");

        const temps = datos.map((d) => d.temperatura);
        const tempMax = temps.reduce((max, t) => (t > max ? t : max), temps[0]);
        const tempMin = temps.reduce((min, t) => (t < min ? t : min), temps[0]);
        const tempMedia = redondear2(temps.reduce((a, b) => a + b, 0) / temps.length);
        const tempMediana = redondear2(calcularMediana(temps));

        return await prisma.resumenDiario.upsert({
            where: { idSucursal_fecha: { idSucursal, fecha: inicio } },
            create: { fecha: inicio, tempMax, tempMin, tempMedia, tempMediana, totalLecturas: datos.length, idSucursal },
            update: { tempMax, tempMin, tempMedia, tempMediana, totalLecturas: datos.length },
            select: resumenDiarioSelect,
        }) as ResumenDiarioResponse;
    },

    async obtenerPorSucursal(idSucursal: number): Promise<ResumenDiarioResponse[]> {
        return await prisma.resumenDiario.findMany({
            where: { idSucursal },
            orderBy: { fecha: "asc" },
            select: resumenDiarioSelect,
        }) as ResumenDiarioResponse[];
    },

    // ── Para el Excel: stats por congelador agrupados por día ─────────────────
    async obtenerJerarquiaConResumen({
        idSucursal,
        fechaInicio,
        fechaFin,
    }: {
        idSucursal: number;
        fechaInicio?: string;
        fechaFin?: string;
    }): Promise<SeccionResumen[]> {
        const creadoFilter: Record<string, Date> = {};
        if (fechaInicio) {
            const { inicio } = parsearFecha(fechaInicio);
            creadoFilter.gte = inicio;
        }
        if (fechaFin) {
            const { fin } = parsearFecha(fechaFin);
            creadoFilter.lte = fin;
        }

        const datos = await prisma.data.findMany({
            where: {
                ...(Object.keys(creadoFilter).length > 0 ? { creado: creadoFilter } : {}),
                dispositivo: {
                    congelador: { seccion: { sucursal: { id: idSucursal } } },
                },
            },
            select: {
                temperatura: true,
                creado: true,
                dispositivo: {
                    select: {
                        congelador: {
                            select: {
                                id: true,
                                nombre: true,
                                seccion: { select: { id: true, nombre: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { creado: "asc" },
        });

        // seccionId → congeladorId → fechaKey → temps[]
        type SecMap = Map<number, { nombre: string; congeladores: Map<number, { nombre: string; fechas: Map<string, number[]> }> }>;
        const seccionMap: SecMap = new Map();

        for (const d of datos) {
            const { congelador } = d.dispositivo;
            const { seccion } = congelador;
            const fechaKey = toFechaKey(d.creado);

            if (!seccionMap.has(seccion.id)) seccionMap.set(seccion.id, { nombre: seccion.nombre, congeladores: new Map() });
            const sec = seccionMap.get(seccion.id)!;

            if (!sec.congeladores.has(congelador.id)) sec.congeladores.set(congelador.id, { nombre: congelador.nombre, fechas: new Map() });
            const cong = sec.congeladores.get(congelador.id)!;

            if (!cong.fechas.has(fechaKey)) cong.fechas.set(fechaKey, []);
            cong.fechas.get(fechaKey)!.push(d.temperatura);
        }

        return Array.from(seccionMap.entries())
            .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre))
            .map(([seccionId, sec]) => ({
                id: seccionId,
                nombre: sec.nombre,
                congeladores: Array.from(sec.congeladores.entries())
                    .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre))
                    .map(([congeladorId, cong]) => ({
                        id: congeladorId,
                        nombre: cong.nombre,
                        dias: Array.from(cong.fechas.entries())
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([fechaKey, temps]) => {
                                const sorted = [...temps].sort((a, b) => a - b);
                                const n = sorted.length;
                                const q = Math.max(1, Math.ceil(n * 0.25));
                                const bottom = sorted.slice(0, q);
                                const top = sorted.slice(-q);
                                return {
                                    fecha: new Date(fechaKey + "T00:00:00Z"),
                                    tempMaxMediana: redondear2(calcularMediana(top)),
                                    tempMaxMedia: redondear2(top.reduce((a, b) => a + b, 0) / top.length),
                                    tempMinMediana: redondear2(calcularMediana(bottom)),
                                    tempMinMedia: redondear2(bottom.reduce((a, b) => a + b, 0) / bottom.length),
                                    tempMedia: redondear2(temps.reduce((a, b) => a + b, 0) / temps.length),
                                    tempMediana: redondear2(calcularMediana(temps)),
                                    totalLecturas: n,
                                };
                            }),
                    })),
            }));
    },

    // ── Para el Excel: datos del día desglosados hasta por sensor ─────────────
    async obtenerDatosDiaDesglosado({
        idSucursal,
        fecha,
        timezone,
    }: {
        idSucursal: number;
        fecha: string;
        timezone?: string;
    }): Promise<SeccionDatos[]> {
        const { inicio, fin } = parsearFecha(fecha);

        const datos = await prisma.data.findMany({
            where: {
                creado: { gte: inicio, lte: fin },
                dispositivo: {
                    congelador: { seccion: { sucursal: { id: idSucursal } } },
                },
            },
            select: {
                temperatura: true,
                creado: true,
                dispositivo: {
                    select: {
                        id: true,
                        nombre: true,
                        congelador: {
                            select: {
                                id: true,
                                nombre: true,
                                seccion: { select: { id: true, nombre: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { creado: "asc" },
        });

        // seccionId → congeladorId → dispositivoId → timeKey → temps[]
        type SensorMap = Map<number, { nombre: string; lecturas: Map<string, number[]> }>;
        type CongMap = Map<number, { nombre: string; sensores: SensorMap }>;
        type SecDatMap = Map<number, { nombre: string; congeladores: CongMap }>;
        const seccionMap: SecDatMap = new Map();

        for (const d of datos) {
            const { dispositivo } = d;
            const { congelador } = dispositivo;
            const { seccion } = congelador;
            const timeKey = toTimeKey(d.creado, timezone);

            if (!seccionMap.has(seccion.id)) seccionMap.set(seccion.id, { nombre: seccion.nombre, congeladores: new Map() });
            const sec = seccionMap.get(seccion.id)!;

            if (!sec.congeladores.has(congelador.id)) sec.congeladores.set(congelador.id, { nombre: congelador.nombre, sensores: new Map() });
            const cong = sec.congeladores.get(congelador.id)!;

            if (!cong.sensores.has(dispositivo.id)) cong.sensores.set(dispositivo.id, { nombre: dispositivo.nombre, lecturas: new Map() });
            const sensor = cong.sensores.get(dispositivo.id)!;

            if (!sensor.lecturas.has(timeKey)) sensor.lecturas.set(timeKey, []);
            sensor.lecturas.get(timeKey)!.push(d.temperatura);
        }

        return Array.from(seccionMap.entries())
            .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre))
            .map(([seccionId, sec]) => ({
                id: seccionId,
                nombre: sec.nombre,
                congeladores: Array.from(sec.congeladores.entries())
                    .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre))
                    .map(([congeladorId, cong]) => ({
                        id: congeladorId,
                        nombre: cong.nombre,
                        sensores: Array.from(cong.sensores.entries())
                            .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre))
                            .map(([sensorId, s]): SensorDatos => ({
                                id: sensorId,
                                nombre: s.nombre,
                                lecturas: new Map(
                                    Array.from(s.lecturas.entries()).map(([k, temps]) => [
                                        k,
                                        redondear2(temps.reduce((a, b) => a + b, 0) / temps.length),
                                    ])
                                ),
                            })),
                    })),
            }));
    },
};
