import { Response, NextFunction } from "express";
import { AppRequest } from "../types/types.js";

export class QueryMiddleware {
  static execute(req: AppRequest, _res: Response, next: NextFunction): void {
    const { query } = req;
    const where: Record<string, unknown> = {};

    const { nombre, estatus, identificador, fecha, cliente, sucursal, seccion, dispositivo, gateway } = query as Record<
      string,
      string | undefined
    >;

    // Estatus: por defecto true salvo que venga explícitamente false
    const VALORES_FALSOS = ["false", "0"];
    where["estatus"] =
      estatus !== undefined ? !VALORES_FALSOS.includes(estatus) : true;

    // Filtros de texto con contains
    if (nombre !== undefined)
      where["nombre"] = nombre ? { contains: nombre } : undefined;
    if (identificador !== undefined)
      where["identificador"] = identificador
        ? { contains: identificador }
        : undefined;

    // Filtro de fecha
    if (fecha) {
      const [year, month, day] = fecha.split("-").map(Number);
      const limiteInferior = new Date(
        Date.UTC(year, month - 1, day, 0, 0, 0, 0),
      );
      const limiteSuperior = new Date(
        Date.UTC(year, month - 1, day, 23, 59, 59, 999),
      );

      where["creado"] = {
        gte: limiteInferior.toISOString(),
        lt: limiteSuperior.toISOString(),
      };
    }

    //filtros de relaciones
    if (cliente !== undefined) where["cliente"] = cliente && { id: { equals: parseInt(cliente) } };
    if (sucursal !== undefined) where["sucursal"] = sucursal && { id: { equals: parseInt(sucursal) } };
    if (seccion !== undefined) where["seccion"] = seccion && { id: { equals: parseInt(seccion) } };
    if (dispositivo !== undefined) where["dispositivo"] = dispositivo && { id: { equals: parseInt(dispositivo) } };
    if (gateway !== undefined) where["gateway"] = gateway && { id: { equals: parseInt(gateway) } };
    
    req.where = where;
    next();
  }
}
