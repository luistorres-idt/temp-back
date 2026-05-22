import { Response } from "express";
import { AppRequest } from "../types/types.js";
import { ResumenDiarioModel } from "../models/resumenDiario.js";
import { evaluarResumenDiario } from "../schemas/resumenDiario.js";
import { generarReporteExcel } from "../utils/excel.js";
import { MENSAJE_ERROR } from "../utils/mensajes.js";
import { prisma } from "../config/db.js";
import { CRON_TIMEZONE } from "../config/settings.js";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseFechaParam(val: unknown): string | null {
    return typeof val === "string" && FECHA_REGEX.test(val) ? val : null;
}

export class ReportesController {
    // POST /api/reportes/sucursales/:id/calcular
    // Body: { fecha: "YYYY-MM-DD" }
    calcularResumen = async (req: AppRequest, res: Response): Promise<void> => {
        const idSucursal = parseInt(String(req.params.id), 10);
        if (isNaN(idSucursal)) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        const result = evaluarResumenDiario(req.body);
        if (!result.success) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        try {
            const resumen = await ResumenDiarioModel.calcularYGuardar({
                idSucursal,
                fecha: result.data.fecha,
            });
            res.status(201).json({ data: resumen });
        } catch (err) {
            if (err instanceof Error && err.message === "SIN_DATOS") {
                res.status(404).json({ error: "No hay datos para el día y sucursal especificados" });
                return;
            }
            console.error(err);
            res.status(500).json({ error: MENSAJE_ERROR.CREACION });
        }
    };

    // GET /api/reportes/sucursales/:id/excel
    // Query params:
    //   fecha        (requerido)  — día que se detalla en hoja "Datos" (YYYY-MM-DD)
    //   fechaInicio  (opcional)   — límite inferior para hoja "Resumen"
    //   fechaFin     (opcional)   — límite superior para hoja "Resumen"
    generarExcel = async (req: AppRequest, res: Response): Promise<void> => {
        const idSucursal = parseInt(String(req.params.id), 10);
        if (isNaN(idSucursal)) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        const fecha = parseFechaParam(req.query.fecha);
        if (!fecha) {
            res.status(400).json({ error: "Parámetro 'fecha' requerido en formato YYYY-MM-DD" });
            return;
        }

        const fechaInicio = parseFechaParam(req.query.fechaInicio) ?? fecha;
        const fechaFin = parseFechaParam(req.query.fechaFin) ?? fecha;

        try {
            const sucursal = await prisma.sucursal.findFirstOrThrow({
                where: { id: idSucursal, estatus: true },
                select: { nombre: true },
            });

            const [secciones, seccionesDatos] = await Promise.all([
                ResumenDiarioModel.obtenerJerarquiaConResumen({ idSucursal, fechaInicio, fechaFin }),
                ResumenDiarioModel.obtenerDatosDiaDesglosado({ idSucursal, fecha, timezone: CRON_TIMEZONE }),
            ]);

            const buffer = await generarReporteExcel({
                sucursalNombre: sucursal.nombre,
                secciones,
                seccionesDatos,
                fechaDia: fecha,
            });

            const nombre = `reporte-${sucursal.nombre.replace(/\s+/g, "-")}-${fecha}.xlsx`;
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
            res.send(buffer);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: MENSAJE_ERROR.LISTADO });
        }
    };
}
