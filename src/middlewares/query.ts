import { Response, NextFunction } from "express";
import { AppRequest } from "../types/types.js";
import { PERFILES, PERFILES_ID } from "../utils/perfiles.js";

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

// ---------------------------------------------------------------------------
// Middlewares de scoping por recurso
// Cada clase restringe req.where según el perfil del usuario autenticado.
// Si req.usuario no existe (auth desactivada), no se aplica ningún filtro.
// ---------------------------------------------------------------------------

/**
 * Clientes: el superusuario ve todos; el resto solo ve su propio cliente.
 */
export class QueryClientesMiddleware {
  static execute(req: AppRequest, _res: Response, next: NextFunction): void {
    const { usuario, where } = req;
    if (!usuario || !where) return next();

    const perfilNombre = usuario.perfil?.nombre ?? "";
    const idCliente = usuario.cliente?.id;

    if (perfilNombre !== PERFILES.SUPERUSUARIO && idCliente) {
      // El scoping filtra por id del propio cliente del usuario.
      // Se elimina cualquier filtro de 'id' que viniera del querystring.
      delete where["id"];
      where["id"] = { equals: idCliente };
    }

    next();
  }
}

/**
 * Sucursales:
 * - Superusuario: sin restricciones.
 * - Administrador (con cliente): solo sucursales de su cliente.
 * - Supervisor (con sucursal fija): solo su sucursal.
 */
export class QuerySucursalesMiddleware {
  static execute(req: AppRequest, _res: Response, next: NextFunction): void {
    const { usuario, where } = req;
    if (!usuario || !where) return next();

    const perfilNombre = usuario.perfil?.nombre ?? "";
    const idCliente = usuario.cliente?.id;
    const idSucursal = usuario.sucursal?.id;

    if (perfilNombre === PERFILES.SUPERUSUARIO) return next();

    // Sanear filtros de tenant del querystring antes de imponer el scoping
    delete where["id"];
    delete where["cliente"];

    if (idSucursal) {
      where["id"] = { equals: idSucursal };
    } else if (idCliente) {
      where["cliente"] = { id: { equals: idCliente } };
    }

    next();
  }
}

/**
 * Secciones:
 * - Superusuario: sin restricciones.
 * - Con sucursal fija: solo secciones de esa sucursal.
 * - Con cliente: secciones cuya sucursal pertenezca a ese cliente.
 */
export class QuerySeccionesMiddleware {
  static execute(req: AppRequest, _res: Response, next: NextFunction): void {
    const { usuario, where } = req;
    if (!usuario || !where) return next();

    const perfilNombre = usuario.perfil?.nombre ?? "";
    const idCliente = usuario.cliente?.id;
    const idSucursal = usuario.sucursal?.id;

    if (perfilNombre === PERFILES.SUPERUSUARIO) return next();

    // Sanear filtros de tenant del querystring
    delete where["sucursal"];

    if (idSucursal) {
      where["sucursal"] = { id: { equals: idSucursal } };
    } else if (idCliente) {
      where["sucursal"] = { cliente: { id: { equals: idCliente } } };
    }

    next();
  }
}

/**
 * Congeladores:
 * - Superusuario: sin restricciones.
 * - Con sucursal fija: solo congeladores en secciones de esa sucursal.
 * - Con cliente: congeladores cuya sección->sucursal pertenezca a ese cliente.
 */
export class QueryCongeladoresMiddleware {
  static execute(req: AppRequest, _res: Response, next: NextFunction): void {
    const { usuario, where } = req;
    if (!usuario || !where) return next();

    const perfilNombre = usuario.perfil?.nombre ?? "";
    const idCliente = usuario.cliente?.id;
    const idSucursal = usuario.sucursal?.id;

    if (perfilNombre === PERFILES.SUPERUSUARIO) return next();

    // Sanear filtros de tenant del querystring
    delete where["seccion"];

    if (idSucursal) {
      where["seccion"] = { sucursal: { id: { equals: idSucursal } } };
    } else if (idCliente) {
      where["seccion"] = { sucursal: { cliente: { id: { equals: idCliente } } } };
    }

    next();
  }
}

/**
 * Dispositivos:
 * - Superusuario: sin restricciones.
 * - Con sucursal fija: dispositivos cuyo congelador->seccion->sucursal coincida.
 * - Con cliente: navigation completa hasta cliente.
 */
export class QueryDispositivosMiddleware {
  static execute(req: AppRequest, _res: Response, next: NextFunction): void {
    const { usuario, where } = req;
    if (!usuario || !where) return next();

    const perfilNombre = usuario.perfil?.nombre ?? "";
    const idCliente = usuario.cliente?.id;
    const idSucursal = usuario.sucursal?.id;

    if (perfilNombre === PERFILES.SUPERUSUARIO) return next();

    // Sanear filtros de tenant del querystring
    delete where["congelador"];

    if (idSucursal) {
      where["congelador"] = { seccion: { sucursal: { id: { equals: idSucursal } } } };
    } else if (idCliente) {
      where["congelador"] = { seccion: { sucursal: { cliente: { id: { equals: idCliente } } } } };
    }

    next();
  }
}

/**
 * Usuarios:
 * - Superusuario: ve todos los usuarios (perfil >= 1).
 * - Administrador: ve usuarios de perfil mayor o igual al suyo + restringido a su cliente.
 * - Supervisor: ve usuarios de perfil mayor o igual al suyo + restringido a su sucursal.
 *
 * La restricción de perfil es jerárquica: no se puede ver a usuarios de menor jerarquía que uno mismo.
 */
export class QueryUsuariosMiddleware {
  static execute(req: AppRequest, _res: Response, next: NextFunction): void {
    const { usuario, where } = req;
    if (!usuario || !where) return next();

    const perfilId = usuario.perfil?.id;
    const perfilNombre = usuario.perfil?.nombre ?? "";
    const idCliente = usuario.cliente?.id;
    const idSucursal = usuario.sucursal?.id;

    // Restricción jerárquica: solo puede ver usuarios de perfil de mayor id (menor jerarquía)
    if (perfilId === PERFILES_ID.SUPERUSUARIO) {
      // Superusuario ve todo, no se agrega restricción de perfil
    } else if (perfilId === PERFILES_ID.ADMINISTRADOR) {
      where["perfil"] = where["perfil"] ?? { id: { gte: PERFILES_ID.ADMINISTRADOR } };
    } else if (perfilId === PERFILES_ID.SUPERVISOR) {
      where["perfil"] = where["perfil"] ?? { id: { gte: PERFILES_ID.SUPERVISOR } };
    }

    // Restricción de tenant
    if (perfilNombre !== PERFILES.SUPERUSUARIO && idCliente) {
      where["cliente"] = { id: { equals: idCliente } };
    }

    if (idSucursal) {
      where["sucursal"] = { id: { equals: idSucursal } };
    }

    next();
  }
}

