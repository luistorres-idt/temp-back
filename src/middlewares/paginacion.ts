import { Response, NextFunction } from "express";
import { PaginacionDTO } from "../dto/paginacion.js";
import { AppRequest } from "../types/types.js";

export class PaginacionMiddleware {
    static execute(req: AppRequest, _res: Response, next: NextFunction): void {
        const { query } = req;
        const { elementos, listado, pagina } = PaginacionDTO.parse(query as Record<string, string>);

        req.paginacion = {
            take: listado ? undefined : elementos,
            skip: listado ? undefined : elementos * (pagina - 1),
        };

        next();
    }
}
