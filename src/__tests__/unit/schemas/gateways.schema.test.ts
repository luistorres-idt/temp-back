import { describe, it, expect } from 'vitest'
import { evaluarGateway, evaluarGatewayParcial } from '../../../schemas/gateways.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

const gatewayValido = () => ({
    identificador: 'GW-001-ABC',
    nombre: 'Gateway Principal Matriz',
    idSeccion: 1,
    estatus: true,
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GatewaySchema - validación de gateway', () => {
    describe('evaluarGateway (creación/edición completa)', () => {
        it('acepta un gateway válido completo', () => {
            const result = evaluarGateway(gatewayValido())
            expect(result.success).toBe(true)
        })

        it('acepta gateway sin estatus (campo nullish)', () => {
            const { estatus: _, ...sinEstatus } = gatewayValido()
            const result = evaluarGateway(sinEstatus)
            expect(result.success).toBe(true)
        })

        it('acepta estatus null (nullish)', () => {
            const result = evaluarGateway({ ...gatewayValido(), estatus: null })
            expect(result.success).toBe(true)
        })

        it('falla si falta el identificador', () => {
            const { identificador: _, ...sinId } = gatewayValido()
            const result = evaluarGateway(sinId)
            expect(result.success).toBe(false)
        })

        it('falla si falta el nombre', () => {
            const { nombre: _, ...sinNombre } = gatewayValido()
            const result = evaluarGateway(sinNombre)
            expect(result.success).toBe(false)
        })

        it('falla si falta idSeccion', () => {
            const { idSeccion: _, ...sinSeccion } = gatewayValido()
            const result = evaluarGateway(sinSeccion)
            expect(result.success).toBe(false)
        })

        it('falla si idSeccion no es entero', () => {
            const result = evaluarGateway({ ...gatewayValido(), idSeccion: 1.5 })
            expect(result.success).toBe(false)
        })

        it('falla si idSeccion es string', () => {
            const result = evaluarGateway({ ...gatewayValido(), idSeccion: '1' })
            expect(result.success).toBe(false)
        })

        it('falla si identificador es número en vez de string', () => {
            const result = evaluarGateway({ ...gatewayValido(), identificador: 123 })
            expect(result.success).toBe(false)
        })

        it('retorna los datos parseados correctamente', () => {
            const result = evaluarGateway(gatewayValido())
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.identificador).toBe('GW-001-ABC')
                expect(result.data.nombre).toBe('Gateway Principal Matriz')
                expect(result.data.idSeccion).toBe(1)
                expect(result.data.estatus).toBe(true)
            }
        })
    })

    describe('evaluarGatewayParcial (actualizaciones parciales)', () => {
        it('acepta un objeto vacío', () => {
            const result = evaluarGatewayParcial({})
            expect(result.success).toBe(true)
        })

        it('acepta solo el nombre', () => {
            const result = evaluarGatewayParcial({ nombre: 'Nuevo nombre' })
            expect(result.success).toBe(true)
        })

        it('acepta solo el identificador', () => {
            const result = evaluarGatewayParcial({ identificador: 'GW-NEW' })
            expect(result.success).toBe(true)
        })

        it('acepta solo estatus false', () => {
            const result = evaluarGatewayParcial({ estatus: false })
            expect(result.success).toBe(true)
        })
    })
})
