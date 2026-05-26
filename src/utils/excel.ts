import ExcelJS from "exceljs";
import type { SeccionResumen, SeccionDatos } from "../types/resumenDiario.js";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const COLOR = {
    NAVY: "FF1F4E79",
    BLUE: "FF2E75B6",
    BLUE_LIGHT: "FFDAE3F3",
    ROW_ALT: "FFF2F7FC",
    WHITE: "FFFFFFFF",
    TEXT_WHITE: "FFFFFFFF",
    TEXT_DARK: "FF1F1F1F",
};

// ─── Utilidades ───────────────────────────────────────────────────────────────

export function colLetter(n: number): string {
    let letter = "";
    while (n > 0) {
        const rem = (n - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        n = Math.floor((n - 1) / 26);
    }
    return letter;
}

function fillSolid(argb: string): ExcelJS.Fill {
    return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function applyHeader(cell: ExcelJS.Cell, bgArgb: string, textArgb = COLOR.TEXT_WHITE, bold = true) {
    cell.fill = fillSolid(bgArgb);
    cell.font = { bold, color: { argb: textArgb } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
}

// ─── Hoja 1: Resumen jerárquico (Sección → Congelador → días) ────────────────

function buildResumenSheet(ws: ExcelJS.Worksheet, sucursalNombre: string, secciones: SeccionResumen[]) {
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
        // ── Cabecera de sección ──────────────────────────────────────────────
        ws.mergeCells(`A${row}:${colLetter(COLS)}${row}`);
        const secCell = ws.getCell(`A${row}`);
        secCell.value = `  ${seccion.nombre.toUpperCase()}`;
        applyHeader(secCell, COLOR.NAVY);
        secCell.font = { bold: true, size: 11, color: { argb: COLOR.TEXT_WHITE } };
        secCell.alignment = { horizontal: "left", vertical: "middle" };
        ws.getRow(row).height = 20;
        row++;

        for (const congelador of seccion.congeladores) {
            // ── Cabecera de congelador ───────────────────────────────────────
            ws.mergeCells(`A${row}:${colLetter(COLS)}${row}`);
            const congCell = ws.getCell(`A${row}`);
            congCell.value = `    ${congelador.nombre}`;
            applyHeader(congCell, COLOR.BLUE);
            congCell.font = { bold: true, color: { argb: COLOR.TEXT_WHITE } };
            congCell.alignment = { horizontal: "left", vertical: "middle" };
            ws.getRow(row).height = 18;
            row++;

            // ── Cabecera de columnas ─────────────────────────────────────────
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

            // ── Filas de datos ───────────────────────────────────────────────
            congelador.dias.forEach((dia, i) => {
                const dataRow = ws.getRow(row);
                dataRow.values = [dia.fecha, dia.tempMaxMediana, dia.tempMaxMedia, dia.tempMinMediana, dia.tempMinMedia, dia.tempMedia, dia.tempMediana, dia.totalLecturas];
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

            row++; // separador entre congeladores
        }

        row++; // separador entre secciones
    }
}

// ─── Hoja 2: Datos del día desglosados por sensor ─────────────────────────────

interface SensorFlat {
    colIndex: number;      // 2-based (col A=1 es "Hora")
    seccionId: number;
    seccionNombre: string;
    congeladorId: number;
    congeladorNombre: string;
    sensorId: number;
    sensorNombre: string;
    lecturas: Map<string, number>;
}

function buildDatosSheet(
    ws: ExcelJS.Worksheet,
    sucursalNombre: string,
    seccionesDatos: SeccionDatos[],
    fechaDia: string,
): void {
    // ── Aplanar sensores y asignar índice de columna ─────────────────────────
    const sensors: SensorFlat[] = [];
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

    const totalCols = colIdx - 1; // incluye col A

    // ── Título ───────────────────────────────────────────────────────────────
    if (totalCols > 1) ws.mergeCells(`A1:${colLetter(totalCols)}1`);
    const titleCell = ws.getCell("A1");
    titleCell.value = `Lecturas del ${fechaDia} — ${sucursalNombre}`;
    titleCell.font = { size: 13, bold: true, color: { argb: COLOR.NAVY } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 22;

    // ── Grupos para merge de secciones y congeladores ─────────────────────────
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
        if (lastCong && lastCong.nombre === sensor.congeladorNombre && congeladorGroups[congeladorGroups.length - 1].startCol >= (seccionGroups[seccionGroups.length - 1]?.startCol ?? 0)) {
            lastCong.endCol = sensor.colIndex;
        } else {
            congeladorGroups.push({ nombre: sensor.congeladorNombre, startCol: sensor.colIndex, endCol: sensor.colIndex });
        }
    }

    // ── Fila 2: Secciones ─────────────────────────────────────────────────────
    ws.getCell("A2").value = "";
    ws.getCell("A2").fill = fillSolid(COLOR.NAVY);
    for (const g of seccionGroups) {
        if (g.startCol < g.endCol) ws.mergeCells(2, g.startCol, 2, g.endCol);
        const cell = ws.getCell(2, g.startCol);
        cell.value = g.nombre;
        applyHeader(cell, COLOR.NAVY);
    }
    ws.getRow(2).height = 18;

    // ── Fila 3: Congeladores ──────────────────────────────────────────────────
    ws.getCell("A3").value = "";
    ws.getCell("A3").fill = fillSolid(COLOR.BLUE);
    for (const g of congeladorGroups) {
        if (g.startCol < g.endCol) ws.mergeCells(3, g.startCol, 3, g.endCol);
        const cell = ws.getCell(3, g.startCol);
        cell.value = g.nombre;
        applyHeader(cell, COLOR.BLUE);
    }
    ws.getRow(3).height = 18;

    // ── Fila 4: Nombres de sensores + "Hora" ─────────────────────────────────
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

    // ── Recopilar todos los timeKeys presentes en todos los sensores ──────────
    const allTimeKeys = new Set<string>();
    sensors.forEach((s) => s.lecturas.forEach((_, k) => allTimeKeys.add(k)));
    const timeKeys = Array.from(allTimeKeys).sort();

    // ── Filas de datos ────────────────────────────────────────────────────────
    const FIRST_DATA_ROW = 5;
    timeKeys.forEach((timeKey, i) => {
        const dataRow = ws.getRow(FIRST_DATA_ROW + i);
        dataRow.getCell(1).value = timeKey;
        sensors.forEach((s) => {
            const val = s.lecturas.get(timeKey);
            dataRow.getCell(s.colIndex).value = val !== undefined ? val : null;
            if (val !== undefined) dataRow.getCell(s.colIndex).numFmt = "0.00";
        });
        if (i % 2 === 1) {
            for (let c = 1; c <= totalCols; c++) {
                dataRow.getCell(c).fill = fillSolid(COLOR.ROW_ALT);
            }
        }
    });

    // ── Anchos de columnas ────────────────────────────────────────────────────
    ws.columns = [
        { width: 10 },
        ...sensors.map(() => ({ width: 14 })),
    ];

}

// ─── Función principal exportada ──────────────────────────────────────────────

export async function generarReporteExcel({
    sucursalNombre,
    secciones,
    seccionesDatos,
    fechaDia,
}: {
    sucursalNombre: string;
    secciones: SeccionResumen[];
    seccionesDatos: SeccionDatos[];
    fechaDia: string;
}): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Sistema Cadena de Frio";
    wb.created = new Date();

    const wsResumen = wb.addWorksheet("Resumen");
    buildResumenSheet(wsResumen, sucursalNombre, secciones);

    const wsDatos = wb.addWorksheet("Datos");
    buildDatosSheet(wsDatos, sucursalNombre, seccionesDatos, fechaDia);

    return Buffer.from(await wb.xlsx.writeBuffer());
}
