import cron from "node-cron";
import nodemailer from "nodemailer";
import { prisma } from "../config/db.js";
import { GMAIL_USER, GMAIL_APP_PASSWORD, CRON_TIMEZONE } from "../config/settings.js";
import { ResumenDiarioModel } from "../models/resumenDiario.js";
import { generarReporteExcel } from "../utils/excel.js";

// ─── Transporter (singleton por proceso) ─────────────────────────────────────

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
        });
    }
    return _transporter;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function horaActual(): number {
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: CRON_TIMEZONE,
        hour: "2-digit",
        hour12: false,
    }).formatToParts(new Date());
    const hora = partes.find((p) => p.type === "hour")?.value ?? "0";
    return parseInt(hora, 10) % 24; // % 24 cubre el edge case de "24" a medianoche
}

export function fechaAyer(): string {
    const ahora = new Date();
    const ayer = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() - 1));
    return ayer.toISOString().slice(0, 10);
}

// ─── Envío de reporte para un cliente ────────────────────────────────────────

export async function ejecutarReporteDiario(fechaOverride?: string) {
    const fecha = fechaOverride ?? fechaAyer();
    const hora = horaActual();
    console.log(`[reporteDiario] Tick — hora: ${hora}h`);

    const transporter = getTransporter();

    const clientes = await prisma.cliente.findMany({
        where: {
            estatus: true,
            ...(fechaOverride ? {} : { horaReporte: hora }),
        },
        select: {
            id: true,
            nombre: true,
            usuarios: {
                where: { estatus: true },
                select: { correo: true },
            },
            sucursales: {
                where: { estatus: true },
                select: {
                    id: true,
                    nombre: true,
                    usuarios: {
                        where: { estatus: true },
                        select: { correo: true },
                    },
                },
            },
        },
    });

    if (clientes.length === 0 && !fechaOverride) return;

    const tareas: Promise<void>[] = [];

    for (const cliente of clientes) {
        for (const sucursal of cliente.sucursales) {
            const tarea = (async () => {
                const correosSet = new Set([
                    ...cliente.usuarios.map((u) => u.correo),
                    ...sucursal.usuarios.map((u) => u.correo),
                ]);
                const destinatarios = Array.from(correosSet);

                if (destinatarios.length === 0) {
                    console.warn(`[reporteDiario] Sin usuarios — ${sucursal.nombre}, omitiendo`);
                    return;
                }

                try {
                    await ResumenDiarioModel.calcularYGuardar({ idSucursal: sucursal.id, fecha });

                    const [secciones, seccionesDatos] = await Promise.all([
                        ResumenDiarioModel.obtenerJerarquiaConResumen({
                            idSucursal: sucursal.id,
                            fechaInicio: fecha,
                            fechaFin: fecha,
                        }),
                        ResumenDiarioModel.obtenerDatosDiaDesglosado({ idSucursal: sucursal.id, fecha, timezone: CRON_TIMEZONE }),
                    ]);

                    const buffer = await generarReporteExcel({
                        sucursalNombre: sucursal.nombre,
                        secciones,
                        seccionesDatos,
                        fechaDia: fecha,
                    });

                    const nombreArchivo = `reporte-${sucursal.nombre.replace(/\s+/g, "-")}-${fecha}.xlsx`;

                    await transporter.sendMail({
                        from: `"Sistema Cadena de Frío" <${GMAIL_USER}>`,
                        to: destinatarios.join(", "),
                        subject: `Reporte de temperatura — ${sucursal.nombre} — ${fecha}`,
                        html: `
                            <p>Hola,</p>
                            <p>Adjunto encontrarás el reporte de temperatura del <strong>${fecha}</strong> para la sucursal <strong>${sucursal.nombre}</strong>.</p>
                            <p style="color:#666;font-size:12px;">Este correo fue generado automáticamente por el Sistema Cadena de Frío.</p>
                        `,
                        attachments: [{
                            filename: nombreArchivo,
                            content: buffer,
                            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        }],
                    });

                    console.log(`[reporteDiario] ✓ ${sucursal.nombre} → ${destinatarios.join(", ")}`);
                } catch (err) {
                    if (err instanceof Error && err.message === "SIN_DATOS") {
                        console.warn(`[reporteDiario] Sin datos: ${sucursal.nombre} — ${fecha}`);
                    } else {
                        console.error(`[reporteDiario] ✗ Error en ${sucursal.nombre}:`, err);
                    }
                }
            })();
            tareas.push(tarea);
        }
    }

    await Promise.all(tareas);

    console.log(`[reporteDiario] Finalizado — ${fecha}`);
}

// ─── Registro del cron ────────────────────────────────────────────────────────

export function iniciarReporteCron() {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.warn("[reporteDiario] GMAIL_USER o GMAIL_APP_PASSWORD no configurados — cron desactivado");
        return;
    }

    // Corre al inicio de cada hora y despacha solo los clientes cuya horaReporte coincide
    cron.schedule("0 * * * *", () => ejecutarReporteDiario(), {
        timezone: CRON_TIMEZONE,
    });

    console.log(`[reporteDiario] Cron registrado — revisión cada hora en punto (${CRON_TIMEZONE})`);
}
