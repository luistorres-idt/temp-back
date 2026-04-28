import { describe, it, expect } from 'vitest'
import {
    DomainError,
    EntityNotFoundError,
    ValidationError,
    UnauthorizedError,
} from '../../../shared/domain/DomainError.js'

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DomainError - errores tipados del dominio', () => {
    describe('DomainError (clase base)', () => {
        it('crea un error con code, message y httpStatus personalizado', () => {
            const err = new DomainError('MI_ERROR', 'algo falló', 422)
            expect(err.code).toBe('MI_ERROR')
            expect(err.message).toBe('algo falló')
            expect(err.httpStatus).toBe(422)
        })

        it('usa httpStatus 400 por defecto', () => {
            const err = new DomainError('ERROR_DEFAULT', 'mensaje')
            expect(err.httpStatus).toBe(400)
        })

        it('es una instancia de Error', () => {
            const err = new DomainError('X', 'msg')
            expect(err).toBeInstanceOf(Error)
        })

        it('tiene name igual al nombre del constructor', () => {
            const err = new DomainError('X', 'msg')
            expect(err.name).toBe('DomainError')
        })
    })

    describe('DomainError.isDomainError (type guard)', () => {
        it('retorna true para una instancia de DomainError', () => {
            const err = new DomainError('X', 'msg')
            expect(DomainError.isDomainError(err)).toBe(true)
        })

        it('retorna true para subclases de DomainError', () => {
            const err = new EntityNotFoundError('Gateway', 'GW-999')
            expect(DomainError.isDomainError(err)).toBe(true)
        })

        it('retorna false para un Error genérico', () => {
            const err = new Error('error normal')
            expect(DomainError.isDomainError(err)).toBe(false)
        })

        it('retorna false para null', () => {
            expect(DomainError.isDomainError(null)).toBe(false)
        })

        it('retorna false para un string', () => {
            expect(DomainError.isDomainError('error string')).toBe(false)
        })

        it('retorna false para un número', () => {
            expect(DomainError.isDomainError(500)).toBe(false)
        })
    })

    describe('EntityNotFoundError', () => {
        it('genera el code en formato ENTIDAD_NO_ENCONTRADO (mayúsculas)', () => {
            const err = new EntityNotFoundError('Gateway', 'GW-001')
            expect(err.code).toBe('GATEWAY_NO_ENCONTRADO')
        })

        it('incluye el identificador en el mensaje', () => {
            const err = new EntityNotFoundError('Congelador', 42)
            expect(err.message).toContain('42')
            expect(err.message).toContain('Congelador')
        })

        it('usa httpStatus 404', () => {
            const err = new EntityNotFoundError('Gateway', 1)
            expect(err.httpStatus).toBe(404)
        })

        it('es instancia de DomainError', () => {
            const err = new EntityNotFoundError('X', 1)
            expect(err).toBeInstanceOf(DomainError)
        })

        it('funciona con identificadores numéricos y de string', () => {
            expect(new EntityNotFoundError('A', 1).code).toBe('A_NO_ENCONTRADO')
            expect(new EntityNotFoundError('A', 'abc').code).toBe('A_NO_ENCONTRADO')
        })
    })

    describe('ValidationError', () => {
        it('tiene code VALIDACION_DATOS', () => {
            const err = new ValidationError()
            expect(err.code).toBe('VALIDACION_DATOS')
        })

        it('usa el mensaje por defecto si no se proporciona', () => {
            const err = new ValidationError()
            expect(err.message).toBe('Los datos proporcionados no son validos')
        })

        it('acepta mensaje personalizado', () => {
            const err = new ValidationError('El campo X es requerido')
            expect(err.message).toBe('El campo X es requerido')
        })

        it('usa httpStatus 400', () => {
            expect(new ValidationError().httpStatus).toBe(400)
        })
    })

    describe('UnauthorizedError', () => {
        it('tiene code NO_AUTORIZADO', () => {
            const err = new UnauthorizedError()
            expect(err.code).toBe('NO_AUTORIZADO')
        })

        it('usa httpStatus 403', () => {
            expect(new UnauthorizedError().httpStatus).toBe(403)
        })

        it('acepta mensaje personalizado', () => {
            const err = new UnauthorizedError('Solo administradores')
            expect(err.message).toBe('Solo administradores')
        })
    })
})
