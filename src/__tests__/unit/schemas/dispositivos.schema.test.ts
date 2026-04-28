import { describe, it, expect } from 'vitest'
import { evaluarDispositivo, evaluarDispositivoParcial } from '../../../schemas/dispositivos.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

const dispositivoValido = () => ({
    nombre: 'Sensor Temp #1',
    identificador: '00:1A:2B:3C:4D:5E',
    idGateway: 1,
    idCongelador: 2,
    estatus: true,
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DispositivoSchema - validación de dispositivo', () => {
    describe('evaluarDispositivo (creación/edición completa)', () => {
        it('acepta un dispositivo válido completo', () => {
            const result = evaluarDispositivo(dispositivoValido())
            expect(result.success).toBe(true)
        })

        it('acepta dispositivo sin estatus (campo nullish)', () => {
            const { estatus: _, ...sinEstatus } = dispositivoValido()
            const result = evaluarDispositivo(sinEstatus)
            expect(result.success).toBe(true)
        })

        it('falla si falta el identificador (MAC address)', () => {
            const { identificador: _, ...sinId } = dispositivoValido()
            const result = evaluarDispositivo(sinId)
            expect(result.success).toBe(false)
        })

        it('falla si falta el nombre', () => {
            const { nombre: _, ...sinNombre } = dispositivoValido()
            const result = evaluarDispositivo(sinNombre)
            expect(result.success).toBe(false)
        })

        it('falla si falta idGateway', () => {
            const { idGateway: _, ...sinGateway } = dispositivoValido()
            const result = evaluarDispositivo(sinGateway)
            expect(result.success).toBe(false)
        })

        it('falla si falta idCongelador', () => {
            const { idCongelador: _, ...sinCongelador } = dispositivoValido()
            const result = evaluarDispositivo(sinCongelador)
            expect(result.success).toBe(false)
        })

        it('falla si idGateway no es entero', () => {
            const result = evaluarDispositivo({ ...dispositivoValido(), idGateway: 1.5 })
            expect(result.success).toBe(false)
        })

        it('falla si idCongelador es string', () => {
            const result = evaluarDispositivo({ ...dispositivoValido(), idCongelador: '2' })
            expect(result.success).toBe(false)
        })

        it('falla si identificador es número en vez de string', () => {
            const result = evaluarDispositivo({ ...dispositivoValido(), identificador: 1122334455 })
            expect(result.success).toBe(false)
        })

        it('retorna los datos parseados correctamente', () => {
            const result = evaluarDispositivo(dispositivoValido())
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.nombre).toBe('Sensor Temp #1')
                expect(result.data.identificador).toBe('00:1A:2B:3C:4D:5E')
                expect(result.data.idGateway).toBe(1)
                expect(result.data.idCongelador).toBe(2)
            }
        })
    })

    describe('evaluarDispositivoParcial (actualizaciones parciales)', () => {
        it('acepta un objeto vacío', () => {
            const result = evaluarDispositivoParcial({})
            expect(result.success).toBe(true)
        })

        it('acepta solo el nombre', () => {
            const result = evaluarDispositivoParcial({ nombre: 'Nuevo nombre' })
            expect(result.success).toBe(true)
        })

        it('acepta solo el identificador', () => {
            const result = evaluarDispositivoParcial({ identificador: 'AA:BB:CC:DD:EE:FF' })
            expect(result.success).toBe(true)
        })

        it('acepta solo estatus false', () => {
            const result = evaluarDispositivoParcial({ estatus: false })
            expect(result.success).toBe(true)
        })

        it('acepta idGateway e idCongelador en conjunto', () => {
            const result = evaluarDispositivoParcial({ idGateway: 3, idCongelador: 5 })
            expect(result.success).toBe(true)
        })
    })
})
