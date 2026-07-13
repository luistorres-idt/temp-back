import { parentPort, workerData } from "worker_threads";
import ExcelJS from "exceljs";

// ─── Math & Format Utilities ────────────────────────────────────────────────
function calcularMediana(valores: number[]): number {
    if (valores.length === 0) return 0;
    const sorted = [...valores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

function redondear2(n: number): number {
    return Math.round(n * 100) / 100;
}

function toFechaKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatTimeKey(date: Date, timezone: string, includeDate: boolean): string {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone || "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    };
    if (includeDate) {
        options.year = "numeric";
        options.month = "2-digit";
        options.day = "2-digit";
    }

    const partes = new Intl.DateTimeFormat("en-US", options).formatToParts(date);
    const hour = partes.find((p) => p.type === "hour")?.value ?? "00";
    const minute = partes.find((p) => p.type === "minute")?.value ?? "00";
    const h = parseInt(hour, 10) % 24;
    const timeStr = `${String(h).padStart(2, "0")}:${minute}`;

    if (includeDate) {
        const year = partes.find((p) => p.type === "year")?.value ?? "0000";
        const month = partes.find((p) => p.type === "month")?.value ?? "00";
        const day = partes.find((p) => p.type === "day")?.value ?? "00";
        return `${year}-${month}-${day} ${timeStr}`;
    }
    return timeStr;
}

function colLetter(n: number): string {
    let letter = "";
    while (n > 0) {
        const rem = (n - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        n = Math.floor((n - 1) / 26);
    }
    return letter;
}

// ─── Paleta de colores ────────────────────────────────────────────────────────
const COLOR = {
    NAVY: "FF1F4E79",
    BLUE: "FF2E75B6",
    BLUE_LIGHT: "FFDAE3F3",
    ROW_ALT: "FFF2F7FC",
    WHITE: "FFFFFFFF",
    TEXT_WHITE: "FFFFFFFF",
    TEXT_DARK: "FF1F1F1F",
};

function fillSolid(argb: string): ExcelJS.Fill {
    return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function applyHeader(cell: ExcelJS.Cell, bgArgb: string, textArgb = COLOR.TEXT_WHITE, bold = true) {
    cell.fill = fillSolid(bgArgb);
    cell.font = { bold, color: { argb: textArgb } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
}

// ─── Data Shaping ────────────────────────────────────────────────────────────

interface RawTelemetry {
    temperatura: number;
    creado: string | Date;
    dispositivo: {
        id: number;
        nombre: string;
        congelador: {
            id: number;
            nombre: string;
            seccion: {
                id: number;
                nombre: string;
            };
        };
    };
}

function shapeResumen(datos: RawTelemetry[]) {
    // seccionId -> { nombre, congeladores: Map<congeladorId, { nombre, fechas: Map<fechaKey, temps[]> }> }
    const seccionMap = new Map<number, { nombre: string; congeladores: Map<number, { nombre: string; fechas: Map<string, number[]> }> }>();

    for (const d of datos) {
        const { congelador } = d.dispositivo;
        const { seccion } = congelador;
        const creadoDate = new Date(d.creado);
        const fechaKey = toFechaKey(creadoDate);

        if (!seccionMap.has(seccion.id)) {
            seccionMap.set(seccion.id, { nombre: seccion.nombre, congeladores: new Map() });
        }
        const sec = seccionMap.get(seccion.id)!;

        if (!sec.congeladores.has(congelador.id)) {
            sec.congeladores.set(congelador.id, { nombre: congelador.nombre, fechas: new Map() });
        }
        const cong = sec.congeladores.get(congelador.id)!;

        if (!cong.fechas.has(fechaKey)) {
            cong.fechas.set(fechaKey, []);
        }
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
}

function shapeDatos(datos: RawTelemetry[], timezone: string, isRango: boolean) {
    // seccionId -> congeladorId -> dispositivoId -> timeKey -> temps[]
    const seccionMap = new Map<number, {
        nombre: string;
        congeladores: Map<number, {
            nombre: string;
            sensores: Map<number, {
                nombre: string;
                lecturas: Map<string, number[]>;
            }>;
        }>;
    }>();

    for (const d of datos) {
        const { dispositivo } = d;
        const { congelador } = dispositivo;
        const { seccion } = congelador;
        const creadoDate = new Date(d.creado);
        const timeKey = formatTimeKey(creadoDate, timezone, isRango);

        if (!seccionMap.has(seccion.id)) {
            seccionMap.set(seccion.id, { nombre: seccion.nombre, congeladores: new Map() });
        }
        const sec = seccionMap.get(seccion.id)!;

        if (!sec.congeladores.has(congelador.id)) {
            sec.congeladores.set(congelador.id, { nombre: congelador.nombre, sensores: new Map() });
        }
        const cong = sec.congeladores.get(congelador.id)!;

        if (!cong.sensores.has(dispositivo.id)) {
            cong.sensores.set(dispositivo.id, { nombre: dispositivo.nombre, lecturas: new Map() });
        }
        const sensor = cong.sensores.get(dispositivo.id)!;

        if (!sensor.lecturas.has(timeKey)) {
            sensor.lecturas.set(timeKey, []);
        }
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
                        .map(([sensorId, s]) => ({
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
}

// ─── Excel Building ──────────────────────────────────────────────────────────

function buildResumenSheet(ws: ExcelJS.Worksheet, sucursalNombre: string, secciones: any[]) {
    const COLS = 8;
    ws.getRow(1).height = 24;
    ws.mergeCells(`A1:${colLetter(COLS)}1`);
    const title = ws.getCell("A1");
    title.value = `Reporte de Temperatura — ${sucursalNombre}`;
    title.font = { size: 14, bold: true, color: { argb: COLOR.NAVY } };
    title.alignment = { horizontal: "center", vertical: "middle" };

    ws.columns = [
        { width: 14 }, { width: 18 }, { width: 16 }, { width: 18 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 12 },
    ];

    let row = 3;

    for (const seccion of secciones) {
        ws.mergeCells(`A${row}:${colLetter(COLS)}${row}`);
        const secCell = ws.getCell(`A${row}`);
        secCell.value = `  ${seccion.nombre.toUpperCase()}`;
        applyHeader(secCell, COLOR.NAVY);
        secCell.font = { bold: true, size: 11, color: { argb: COLOR.TEXT_WHITE } };
        secCell.alignment = { horizontal: "left", vertical: "middle" };
        ws.getRow(row).height = 20;
        row++;

        for (const congelador of seccion.congeladores) {
            ws.mergeCells(`A${row}:${colLetter(COLS)}${row}`);
            const congCell = ws.getCell(`A${row}`);
            congCell.value = `    ${congelador.nombre}`;
            applyHeader(congCell, COLOR.BLUE);
            congCell.font = { bold: true, color: { argb: COLOR.TEXT_WHITE } };
            congCell.alignment = { horizontal: "left", vertical: "middle" };
            ws.getRow(row).height = 18;
            row++;

            const colLetters = Array.from({ length: COLS }, (_, i) => colLetter(i + 1));
            const hdr = ws.getRow(row);
            hdr.values = ["Fecha", "Máx. Mediana (°C)", "Máx. Media (°C)", "Mín. Mediana (°C)", "Mín. Media (°C)", "Media (°C)", "Mediana (°C)", "Lecturas"];
            colLetters.forEach((col) => {
                const cell = ws.getCell(`${col}${row}`);
                cell.fill = fillSolid(COLOR.BLUE_LIGHT);
                cell.font = { bold: true, color: { argb: COLOR.TEXT_DARK } };
                cell.alignment = { horizontal: "center" };
                cell.border = { bottom: { style: "thin", color: { argb: COLOR.BLUE } } };
            });
            row++;

            congelador.dias.forEach((dia: any, i: number) => {
                const dataRow = ws.getRow(row);
                dataRow.values = [new Date(dia.fecha), dia.tempMaxMediana, dia.tempMaxMedia, dia.tempMinMediana, dia.tempMinMedia, dia.tempMedia, dia.tempMediana, dia.totalLecturas];
                dataRow.getCell(1).numFmt = "dd/mm/yyyy";
                [2, 3, 4, 5, 6, 7].forEach((c) => { dataRow.getCell(c).numFmt = "0.00"; });
                dataRow.getCell(8).numFmt = "#,##0";
                if (i % 2 === 1) {
                    colLetters.forEach((col) => {
                        ws.getCell(`${col}${row}`).fill = fillSolid(COLOR.ROW_ALT);
                    });
                }
                row++;
            });

            row++; // spacing
        }
        row++; // spacing
    }
}

function buildDatosSheet(ws: ExcelJS.Worksheet, sucursalNombre: string, seccionesDatos: any[], fechaDia: string) {
    const sensors: any[] = [];
    let colIdx = 2;

    for (const sec of seccionesDatos) {
        for (const cong of sec.congeladores) {
            for (const sensor of cong.sensores) {
                sensors.push({
                    colIndex: colIdx++,
                    seccionId: sec.id,
                    seccionNombre: sec.nombre,
                    congeladorId: cong.id,
                    congeladorNombre: cong.nombre,
                    sensorId: sensor.id,
                    sensorNombre: sensor.nombre,
                    lecturas: sensor.lecturas,
                });
            }
        }
    }

    const totalCols = colIdx - 1;

    if (totalCols > 1) ws.mergeCells(`A1:${colLetter(totalCols)}1`);
    const titleCell = ws.getCell("A1");
    titleCell.value = `Lecturas de ${fechaDia} — ${sucursalNombre}`;
    titleCell.font = { size: 13, bold: true, color: { argb: COLOR.NAVY } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 22;

    type Group = { nombre: string; startCol: number; endCol: number };
    const seccionGroups: Group[] = [];
    const congeladorGroups: Group[] = [];

    for (const sensor of sensors) {
        const lastSec = seccionGroups[seccionGroups.length - 1];
        if (lastSec && lastSec.nombre === sensor.seccionNombre) {
            lastSec.endCol = sensor.colIndex;
        } else {
            seccionGroups.push({ nombre: sensor.seccionNombre, startCol: sensor.colIndex, endCol: sensor.colIndex });
        }

        const lastCong = congeladorGroups[congeladorGroups.length - 1];
        if (lastCong && lastCong.nombre === sensor.congeladorNombre && lastCong.startCol >= (seccionGroups[seccionGroups.length - 1]?.startCol ?? 0)) {
            lastCong.endCol = sensor.colIndex;
        } else {
            congeladorGroups.push({ nombre: sensor.congeladorNombre, startCol: sensor.colIndex, endCol: sensor.colIndex });
        }
    }

    ws.getCell("A2").value = "";
    ws.getCell("A2").fill = fillSolid(COLOR.NAVY);
    for (const g of seccionGroups) {
        if (g.startCol < g.endCol) ws.mergeCells(2, g.startCol, 2, g.endCol);
        const cell = ws.getCell(2, g.startCol);
        cell.value = g.nombre;
        applyHeader(cell, COLOR.NAVY);
    }
    ws.getRow(2).height = 18;

    ws.getCell("A3").value = "";
    ws.getCell("A3").fill = fillSolid(COLOR.BLUE);
    for (const g of congeladorGroups) {
        if (g.startCol < g.endCol) ws.mergeCells(3, g.startCol, 3, g.endCol);
        const cell = ws.getCell(3, g.startCol);
        cell.value = g.nombre;
        applyHeader(cell, COLOR.BLUE);
    }
    ws.getRow(3).height = 18;

    const hdrRow = ws.getRow(4);
    hdrRow.getCell(1).value = "Hora";
    applyHeader(hdrRow.getCell(1), COLOR.BLUE_LIGHT, COLOR.TEXT_DARK);
    hdrRow.getCell(1).border = { bottom: { style: "thin", color: { argb: COLOR.BLUE } } };

    for (const s of sensors) {
        const cell = hdrRow.getCell(s.colIndex);
        cell.value = s.sensorNombre;
        applyHeader(cell, COLOR.BLUE_LIGHT, COLOR.TEXT_DARK);
        cell.border = { bottom: { style: "thin", color: { argb: COLOR.BLUE } } };
    }
    hdrRow.height = 18;

    const allTimeKeys = new Set<string>();
    sensors.forEach((s) => {
        // En worker_threads, las lecturas Map se serializan como Arrays de [key, value]
        // si se pasaron crudas, o como objetos normales si eran Maps convertidos.
        // Nos aseguramos de leerlas correctamente:
        if (s.lecturas instanceof Map) {
            s.lecturas.forEach((_: any, k: string) => allTimeKeys.add(k));
        } else if (typeof s.lecturas === "object" && s.lecturas !== null) {
            Object.keys(s.lecturas).forEach((k) => allTimeKeys.add(k));
        }
    });
    const timeKeys = Array.from(allTimeKeys).sort();

    const FIRST_DATA_ROW = 5;
    timeKeys.forEach((timeKey, i) => {
        const dataRow = ws.getRow(FIRST_DATA_ROW + i);
        dataRow.getCell(1).value = timeKey;
        sensors.forEach((s) => {
            let val: number | undefined;
            if (s.lecturas instanceof Map) {
                val = s.lecturas.get(timeKey);
            } else if (typeof s.lecturas === "object" && s.lecturas !== null) {
                val = s.lecturas[timeKey];
            }

            dataRow.getCell(s.colIndex).value = val !== undefined ? val : null;
            if (val !== undefined) dataRow.getCell(s.colIndex).numFmt = "0.00";
        });
        if (i % 2 === 1) {
            for (let c = 1; c <= totalCols; c++) {
                dataRow.getCell(c).fill = fillSolid(COLOR.ROW_ALT);
            }
        }
    });

    ws.columns = [
        { width: 16 }, // Un poco más ancho para soportar "YYYY-MM-DD HH:MM"
        ...sensors.map(() => ({ width: 14 })),
    ];
}

// ─── Worker Entrypoint ────────────────────────────────────────────────────────

async function run() {
    try {
        const {
            sucursalNombre,
            rawDatos,
            timezone,
            isRango,
            fechaDia
        } = workerData as {
            sucursalNombre: string;
            rawDatos: RawTelemetry[];
            timezone: string;
            isRango: boolean;
            fechaDia: string;
        };

        // 1. Shapear datos en el Worker
        const secciones = shapeResumen(rawDatos);
        const seccionesDatos = shapeDatos(rawDatos, timezone, isRango);

        // 2. Generar Excel
        const wb = new ExcelJS.Workbook();
        wb.creator = "Sistema Cadena de Frio";
        wb.created = new Date();

        const wsResumen = wb.addWorksheet("Resumen");
        buildResumenSheet(wsResumen, sucursalNombre, secciones);

        const wsDatos = wb.addWorksheet("Datos");
        buildDatosSheet(wsDatos, sucursalNombre, seccionesDatos, fechaDia);

        const buffer = await wb.xlsx.writeBuffer();
        parentPort?.postMessage({ status: "success", buffer });
    } catch (error) {
        parentPort?.postMessage({
            status: "error",
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

run();
