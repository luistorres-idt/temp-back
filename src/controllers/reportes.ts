import { Response } from "express";
import { AppRequest } from "../types/types.js";
import { ResumenDiarioModel, parsearFecha, redondear2 } from "../models/resumenDiario.js";
import { evaluarResumenDiario } from "../schemas/resumenDiario.js";
import { generarExcelAsync } from "../utils/reporteWorkerLauncher.js";
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
    //   fecha        (opcional)   — día que se detalla en hoja "Datos" (YYYY-MM-DD)
    //   fechaInicio  (opcional)   — límite inferior para rango
    //   fechaFin     (opcional)   — límite superior para rango
    generarExcel = async (req: AppRequest, res: Response): Promise<void> => {
        const idSucursal = parseInt(String(req.params.id), 10);
        if (isNaN(idSucursal)) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        let fechaInicio = parseFechaParam(req.query.fechaInicio);
        let fechaFin = parseFechaParam(req.query.fechaFin);
        let fecha = parseFechaParam(req.query.fecha);

        if (!fechaInicio || !fechaFin) {
            if (fecha) {
                fechaInicio = fecha;
                fechaFin = fecha;
            } else {
                const hoy = new Date();
                const y = hoy.getFullYear();
                const m = String(hoy.getMonth() + 1).padStart(2, "0");
                const d = String(hoy.getDate()).padStart(2, "0");
                const hoyStr = `${y}-${m}-${d}`;
                fechaInicio = hoyStr;
                fechaFin = hoyStr;
                fecha = hoyStr;
            }
        }

        if (!fecha) {
            fecha = fechaFin;
        }

        try {
            const sucursal = await prisma.sucursal.findFirstOrThrow({
                where: { id: idSucursal, estatus: true },
                select: { nombre: true },
            });

            const { inicio } = parsearFecha(fechaInicio);
            const { fin } = parsearFecha(fechaFin);

            const dispositivos = await prisma.dispositivo.findMany({
                where: { congelador: { seccion: { idSucursal } }, estatus: true },
                select: { id: true },
            });
            const idsDispositivos = dispositivos.map((d) => d.id);

            // Obtener toda la telemetría en el rango
            const rawDatos = await prisma.data.findMany({
                where: {
                    creado: { gte: inicio, lte: fin },
                    idDispositivo: { in: idsDispositivos },
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

            if (rawDatos.length === 0) {
                res.status(404).json({ error: "No hay lecturas registradas para el rango de fechas y sucursal especificados" });
                return;
            }

            const isRango = fechaInicio !== fechaFin;
            const fechaDiaLabel = isRango ? `${fechaInicio}_al_${fechaFin}` : fecha;

            // Procesar datos y generar Excel en segundo plano mediante Worker Thread (no bloquea Express)
            const buffer = await generarExcelAsync({
                sucursalNombre: sucursal.nombre,
                rawDatos,
                timezone: CRON_TIMEZONE,
                isRango,
                fechaDia: fechaDiaLabel,
            });

            const nombre = `reporte-${sucursal.nombre.replace(/\s+/g, "-")}-${fechaDiaLabel}.xlsx`;
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
            res.send(buffer);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: MENSAJE_ERROR.LISTADO });
        }
    };

    // GET /api/reportes/sucursales/:id/insights
    // Query params:
    //   fechaInicio  (opcional)   — YYYY-MM-DD
    //   fechaFin     (opcional)   — YYYY-MM-DD
    obtenerInsights = async (req: AppRequest, res: Response): Promise<void> => {
        const idSucursal = parseInt(String(req.params.id), 10);
        if (isNaN(idSucursal)) {
            res.status(400).json({ error: MENSAJE_ERROR.VALIDACION_DATOS });
            return;
        }

        let fechaInicioStr = req.query.fechaInicio as string;
        let fechaFinStr = req.query.fechaFin as string;

        if (!fechaInicioStr || !fechaFinStr) {
            const hoy = new Date();
            const y = hoy.getFullYear();
            const m = String(hoy.getMonth() + 1).padStart(2, "0");
            fechaInicioStr = `${y}-${m}-01`;
            fechaFinStr = `${y}-${m}-${String(hoy.getDate()).padStart(2, "0")}`;
        }

        const fechaInicio = parseFechaParam(fechaInicioStr);
        const fechaFin = parseFechaParam(fechaFinStr);

        if (!fechaInicio || !fechaFin) {
            res.status(400).json({ error: "Fechas inválidas. Formato requerido YYYY-MM-DD" });
            return;
        }

        try {
            // Verificar que exista la sucursal
            await prisma.sucursal.findFirstOrThrow({
                where: { id: idSucursal, estatus: true }
            });

            const { inicio } = parsearFecha(fechaInicio);
            const { fin } = parsearFecha(fechaFin);

            const dispositivos = await prisma.dispositivo.findMany({
                where: { congelador: { seccion: { idSucursal } }, estatus: true },
                select: { id: true },
            });
            const idsDispositivos = dispositivos.map((d) => d.id);

            if (idsDispositivos.length === 0) {
                res.json({
                    data: {
                        tempMax: null,
                        tempMin: null,
                        tempMedia: null,
                        totalLecturas: 0,
                        totalExcursiones: 0,
                        porcentajeExcursiones: 0,
                        congeladorMasInestable: null,
                        bateriaMasBaja: null,
                    }
                });
                return;
            }

            // 1. Estadísticas básicas de temperatura
            const stats = await prisma.data.aggregate({
                where: {
                    creado: { gte: inicio, lte: fin },
                    idDispositivo: { in: idsDispositivos },
                },
                _max: { temperatura: true },
                _min: { temperatura: true },
                _avg: { temperatura: true },
                _count: { id: true },
            });

            const tempMax = stats._max.temperatura ?? null;
            const tempMin = stats._min.temperatura ?? null;
            const tempMedia = stats._avg.temperatura ? redondear2(stats._avg.temperatura) : null;
            const totalLecturas = stats._count.id;

            // 2. Excursiones de temperatura por congelador (lecturas > temperaturaObjetivo)
            const congeladores = await prisma.congelador.findMany({
                where: { seccion: { idSucursal }, estatus: true },
                select: {
                    id: true,
                    nombre: true,
                    temperaturaObjetivo: true,
                    dispositivos: {
                        where: { estatus: true },
                        select: { id: true }
                    }
                }
            });

            let totalExcursiones = 0;
            const congeladoresStats = [];

            for (const cong of congeladores) {
                const idsDisp = cong.dispositivos.map((d) => d.id);
                if (idsDisp.length === 0) continue;

                const countExcursiones = await prisma.data.count({
                    where: {
                        creado: { gte: inicio, lte: fin },
                        idDispositivo: { in: idsDisp },
                        temperatura: { gt: cong.temperaturaObjetivo }
                    }
                });

                const totalLecturasCongelador = await prisma.data.count({
                    where: {
                        creado: { gte: inicio, lte: fin },
                        idDispositivo: { in: idsDisp }
                    }
                });

                totalExcursiones += countExcursiones;
                congeladoresStats.push({
                    id: cong.id,
                    nombre: cong.nombre,
                    temperaturaObjetivo: cong.temperaturaObjetivo,
                    excursiones: countExcursiones,
                    totalLecturas: totalLecturasCongelador,
                    porcentajeInestable: totalLecturasCongelador > 0 ? redondear2((countExcursiones / totalLecturasCongelador) * 100) : 0
                });
            }

            const porcentajeExcursiones = totalLecturas > 0 ? redondear2((totalExcursiones / totalLecturas) * 100) : 0;

            congeladoresStats.sort((a, b) => b.porcentajeInestable - a.porcentajeInestable);
            const congeladorMasInestable = congeladoresStats.length > 0 ? congeladoresStats[0] : null;

            // 3. Sensor/Dispositivo con batería más baja en el rango
            const bateriaBajaReg = await prisma.infoEstatus.findFirst({
                where: {
                    creado: { gte: inicio, lte: fin },
                    dispositivo: { congelador: { seccion: { idSucursal } } }
                },
                orderBy: { bateria: "asc" },
                select: {
                    bateria: true,
                    dispositivo: {
                        select: {
                            nombre: true,
                            congelador: { select: { nombre: true } }
                        }
                    }
                }
            });

            const bateriaMasBaja = bateriaBajaReg ? {
                bateria: bateriaBajaReg.bateria,
                dispositivoNombre: bateriaBajaReg.dispositivo.nombre,
                congeladorNombre: bateriaBajaReg.dispositivo.congelador.nombre
            } : null;

            res.json({
                data: {
                    tempMax,
                    tempMin,
                    tempMedia,
                    totalLecturas,
                    totalExcursiones,
                    porcentajeExcursiones,
                    congeladorMasInestable,
                    bateriaMasBaja,
                }
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: MENSAJE_ERROR.LISTADO });
        }
    };
}

