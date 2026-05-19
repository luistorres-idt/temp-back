/**
 * Clase base para errores tipados del dominio.
 *
 * Permite distinguir errores de negocio (dominio) de errores tecnicos
 * (infraestructura, runtime), facilitando el manejo diferenciado en
 * los controllers HTTP.
 *
 * @example
 * ```ts
 * class CongeladorNoEncontrado extends DomainError {
 *     constructor(id: number) {
 *         super("CONGELADOR_NO_ENCONTRADO", `Congelador con id ${id} no encontrado`);
 *     }
 * }
 * ```
 */
export class DomainError extends Error {
    constructor(
        /** Codigo de error maquina-legible. Ej: "CONGELADOR_NO_ENCONTRADO" */
        public readonly code: string,
        /** Mensaje descriptivo para logs/debugging. */
        message: string,
        /** Codigo HTTP sugerido para la respuesta (default: 400). */
        public readonly httpStatus: number = 400,
    ) {
        super(message);
        this.name = this.constructor.name;
    }

    /** Verifica si un error desconocido es una instancia de DomainError. */
    static isDomainError(error: unknown): error is DomainError {
        return error instanceof DomainError;
    }
}

/**
 * Error lanzado cuando una entidad no se encuentra.
 */
export class EntityNotFoundError extends DomainError {
    constructor(entityName: string, id: number | string) {
        super(
            `${entityName.toUpperCase()}_NO_ENCONTRADO`,
            `${entityName} con id '${id}' no encontrado o inactivo`,
            404,
        );
    }
}

/**
 * Error lanzado cuando los datos de entrada no pasan la validacion.
 */
export class ValidationError extends DomainError {
    constructor(message: string = "Los datos proporcionados no son validos") {
        super("VALIDACION_DATOS", message, 400);
    }
}

/**
 * Error lanzado cuando el usuario no tiene permisos para realizar la accion.
 */
export class UnauthorizedError extends DomainError {
    constructor(message: string = "No tiene permisos para realizar esta accion") {
        super("NO_AUTORIZADO", message, 403);
    }
}
