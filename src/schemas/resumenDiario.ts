import { z } from "zod/v4";

export const ResumenDiarioSchema = z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
});

export const resumenDiarioSelect = {
    id: true,
    fecha: true,
    tempMax: true,
    tempMin: true,
    tempMedia: true,
    tempMediana: true,
    totalLecturas: true,
    sucursal: { select: { id: true, nombre: true } },
};

export const evaluarResumenDiario = (data: unknown) => ResumenDiarioSchema.safeParse(data);
