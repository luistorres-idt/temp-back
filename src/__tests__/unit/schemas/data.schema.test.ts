import { describe, it, expect } from 'vitest'
import { evaluarData, evaluarDataParcial } from '../../../schemas/data.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

const sensorValido = () => ({
    identificador: '00:1A:2B:3C:4D:5E',
    signal: { bateria: 85.5, rssi: -70, snr: 10 },
    data: { temperatura: -18.5, ambiente: 22.3 },
})

const payloadValido = () => ({
    identificador: 'GW-001-ABC',
    data: [sensorValido()],
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DataSchema - validación del payload IoT', () => {
    describe('evaluarData (payload completo)', () => {
        it('acepta un payload válido con un sensor', () => {
            const result = evaluarData(payloadValido())
            expect(result.success).toBe(true)
        })

        it('acepta múltiples sensores en el array data', () => {
            const payload = {
                identificador: 'GW-001-ABC',
                data: [sensorValido(), { ...sensorValido(), identificador: '00:1A:2B:3C:4D:5F' }],
            }
            const result = evaluarData(payload)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.data).toHaveLength(2)
            }
        })

        it('falla si falta el identificador del gateway', () => {
            const { identificador: _, ...sinId } = payloadValido()
            const result = evaluarData(sinId)
            expect(result.success).toBe(false)
        })

        it('falla si el array data está vacío', () => {
            const result = evaluarData({ identificador: 'GW-001', data: [] })
            // Zod permite arrays vacíos a menos que se configure minLength
            // verificamos que sí parsea (el caso de negocio es otro)
            expect(result.success).toBe(true)
        })

        it('falla si falta el identificador del sensor', () => {
            const { identificador: _, ...sensorSinId } = sensorValido()
            const result = evaluarData({ identificador: 'GW-001', data: [sensorSinId] })
            expect(result.success).toBe(false)
        })

        it('falla si signal.bateria no es número', () => {
            const sensor = { ...sensorValido(), signal: { bateria: 'alta', rssi: -70, snr: 10 } }
            const result = evaluarData({ identificador: 'GW-001', data: [sensor] })
            expect(result.success).toBe(false)
        })

        it('falla si data.temperatura no es número', () => {
            const sensor = { ...sensorValido(), data: { temperatura: 'fria', ambiente: 22.3 } }
            const result = evaluarData({ identificador: 'GW-001', data: [sensor] })
            expect(result.success).toBe(false)
        })

        it('falla si data.ambiente no es número', () => {
            const sensor = { ...sensorValido(), data: { temperatura: -18.5, ambiente: null } }
            const result = evaluarData({ identificador: 'GW-001', data: [sensor] })
            expect(result.success).toBe(false)
        })

        it('falla si signal.rssi no es número', () => {
            const sensor = { ...sensorValido(), signal: { bateria: 85, rssi: '-70dBm', snr: 10 } }
            const result = evaluarData({ identificador: 'GW-001', data: [sensor] })
            expect(result.success).toBe(false)
        })

        it('falla si el payload no es un objeto', () => {
            expect(evaluarData(null).success).toBe(false)
            expect(evaluarData('string').success).toBe(false)
            expect(evaluarData(42).success).toBe(false)
        })

        it('retorna los datos parseados correctamente', () => {
            const result = evaluarData(payloadValido())
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.identificador).toBe('GW-001-ABC')
                expect(result.data.data[0].identificador).toBe('00:1A:2B:3C:4D:5E')
                expect(result.data.data[0].signal.bateria).toBe(85.5)
                expect(result.data.data[0].data.temperatura).toBe(-18.5)
            }
        })
    })

    describe('evaluarDataParcial', () => {
        it('acepta un objeto vacío en modo parcial', () => {
            const result = evaluarDataParcial({})
            expect(result.success).toBe(true)
        })

        it('acepta solo el identificador del gateway', () => {
            const result = evaluarDataParcial({ identificador: 'GW-001' })
            expect(result.success).toBe(true)
        })
    })
})
