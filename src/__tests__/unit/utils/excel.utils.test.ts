import { describe, it, expect } from 'vitest'
import { colLetter } from '../../../utils/excel.js'

// ─── colLetter ────────────────────────────────────────────────────────────────

describe('colLetter', () => {
    it('convierte 1 → A', () => {
        expect(colLetter(1)).toBe('A')
    })

    it('convierte 26 → Z', () => {
        expect(colLetter(26)).toBe('Z')
    })

    it('convierte 27 → AA (desbordamiento a doble letra)', () => {
        expect(colLetter(27)).toBe('AA')
    })

    it('convierte 28 → AB', () => {
        expect(colLetter(28)).toBe('AB')
    })

    it('convierte 52 → AZ', () => {
        expect(colLetter(52)).toBe('AZ')
    })

    it('convierte 53 → BA', () => {
        expect(colLetter(53)).toBe('BA')
    })

    it('convierte columnas del reporte (1–8) correctamente', () => {
        const esperado = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        Array.from({ length: 8 }, (_, i) => i + 1).forEach((n, i) => {
            expect(colLetter(n)).toBe(esperado[i])
        })
    })
})
