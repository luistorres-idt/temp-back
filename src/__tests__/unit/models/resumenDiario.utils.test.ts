import { describe, it, expect } from 'vitest'
import {
    calcularMediana,
    redondear2,
    parsearFecha,
    toFechaKey,
    toTimeKey,
} from '../../../models/resumenDiario.js'

// ─── calcularMediana ─────────────────────────────────────────────────────────

describe('calcularMediana', () => {
    it('devuelve 0 para array vacío', () => {
        expect(calcularMediana([])).toBe(0)
    })

    it('devuelve el único elemento para array de un elemento', () => {
        expect(calcularMediana([5])).toBe(5)
    })

    it('devuelve el elemento central para array impar', () => {
        expect(calcularMediana([3, 1, 2])).toBe(2)
    })

    it('devuelve el promedio de los dos centrales para array par', () => {
        expect(calcularMediana([1, 2, 3, 4])).toBe(2.5)
    })

    it('no muta el array original', () => {
        const original = [5, 3, 1, 4, 2]
        calcularMediana(original)
        expect(original).toEqual([5, 3, 1, 4, 2])
    })

    it('maneja valores negativos correctamente', () => {
        expect(calcularMediana([-10, -5, -1])).toBe(-5)
    })

    it('maneja valores decimales', () => {
        expect(calcularMediana([-18.5, -17.3, -19.1])).toBeCloseTo(-18.5)
    })
})

// ─── redondear2 ───────────────────────────────────────────────────────────────

describe('redondear2', () => {
    it('redondea hacia arriba en el tercer decimal', () => {
        expect(redondear2(1.006)).toBe(1.01)
    })

    it('redondea hacia abajo', () => {
        expect(redondear2(1.234)).toBe(1.23)
    })

    it('preserva números ya redondeados', () => {
        expect(redondear2(3.14)).toBe(3.14)
    })

    it('funciona con negativos', () => {
        expect(redondear2(-18.556)).toBe(-18.56)
    })

    it('devuelve enteros sin decimales innecesarios', () => {
        expect(redondear2(5.0)).toBe(5)
    })
})

// ─── parsearFecha ─────────────────────────────────────────────────────────────

describe('parsearFecha', () => {
    it('genera inicio a las 00:00:00 UTC', () => {
        const { inicio } = parsearFecha('2024-03-15')
        expect(inicio.toISOString()).toBe('2024-03-15T00:00:00.000Z')
    })

    it('genera fin a las 23:59:59.999 UTC', () => {
        const { fin } = parsearFecha('2024-03-15')
        expect(fin.toISOString()).toBe('2024-03-15T23:59:59.999Z')
    })

    it('maneja fin de mes correctamente', () => {
        const { inicio, fin } = parsearFecha('2024-01-31')
        expect(inicio.toISOString()).toBe('2024-01-31T00:00:00.000Z')
        expect(fin.toISOString()).toBe('2024-01-31T23:59:59.999Z')
    })

    it('maneja año bisiesto', () => {
        const { inicio } = parsearFecha('2024-02-29')
        expect(inicio.toISOString()).toBe('2024-02-29T00:00:00.000Z')
    })

    it('lanza error con formato inválido', () => {
        expect(() => parsearFecha('no-es-fecha')).toThrow()
    })
})

// ─── toFechaKey ───────────────────────────────────────────────────────────────

describe('toFechaKey', () => {
    it('formatea fecha UTC a YYYY-MM-DD', () => {
        const date = new Date('2024-03-05T12:00:00Z')
        expect(toFechaKey(date)).toBe('2024-03-05')
    })

    it('usa el día UTC, no el local', () => {
        // Las 23:00 UTC = otro día en zonas UTC+1 o más
        const date = new Date('2024-03-15T23:30:00Z')
        expect(toFechaKey(date)).toBe('2024-03-15')
    })

    it('rellena mes y día con cero a la izquierda', () => {
        const date = new Date('2024-01-05T00:00:00Z')
        expect(toFechaKey(date)).toBe('2024-01-05')
    })
})

// ─── toTimeKey ────────────────────────────────────────────────────────────────

describe('toTimeKey', () => {
    it('formatea hora UTC a HH:MM sin timezone', () => {
        const date = new Date('2024-03-15T08:30:00Z')
        expect(toTimeKey(date)).toBe('08:30')
    })

    it('rellena horas y minutos con cero a la izquierda', () => {
        const date = new Date('2024-03-15T01:05:00Z')
        expect(toTimeKey(date)).toBe('01:05')
    })

    it('medianoche UTC sin timezone', () => {
        const date = new Date('2024-03-15T00:00:00Z')
        expect(toTimeKey(date)).toBe('00:00')
    })

    it('convierte a hora local cuando se pasa timezone (UTC-6 → 6h menos)', () => {
        // 12:00 UTC = 06:00 en America/Mexico_City (UTC-6)
        const date = new Date('2024-03-15T12:00:00Z')
        expect(toTimeKey(date, 'America/Mexico_City')).toBe('06:00')
    })

    it('maneja cruce de medianoche con timezone', () => {
        // 04:00 UTC = 22:00 del día anterior en America/Mexico_City
        const date = new Date('2024-03-15T04:00:00Z')
        expect(toTimeKey(date, 'America/Mexico_City')).toBe('22:00')
    })
})
