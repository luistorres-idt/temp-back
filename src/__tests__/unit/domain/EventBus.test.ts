import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '../../../shared/infrastructure/EventBus.js'
import type { DomainEvent } from '../../../shared/domain/DomainEvent.js'

// ─── Helper ──────────────────────────────────────────────────────────────────

const crearEvento = (eventName: string, data: unknown = {}): DomainEvent => ({
    eventName,
    occurredOn: new Date().toISOString(),
    data,
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EventBus - bus de eventos de dominio', () => {
    let bus: EventBus

    beforeEach(() => {
        // Resetear singleton para aislar tests
        ;(EventBus as unknown as { instance: unknown }).instance = undefined
        bus = EventBus.getInstance()
    })

    describe('getInstance', () => {
        it('retorna siempre la misma instancia (singleton)', () => {
            const a = EventBus.getInstance()
            const b = EventBus.getInstance()
            expect(a).toBe(b)
        })
    })

    describe('subscribe / publish', () => {
        it('llama al handler cuando se publica el evento correspondiente', async () => {
            const handler = vi.fn()
            bus.subscribe('test:evento', handler)

            await bus.publish([crearEvento('test:evento', { valor: 42 })])

            expect(handler).toHaveBeenCalledOnce()
            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                eventName: 'test:evento',
                data: { valor: 42 },
            }))
        })

        it('no llama al handler si el evento publicado es diferente', async () => {
            const handler = vi.fn()
            bus.subscribe('evento:A', handler)

            await bus.publish([crearEvento('evento:B')])

            expect(handler).not.toHaveBeenCalled()
        })

        it('llama a múltiples handlers suscritos al mismo evento', async () => {
            const handler1 = vi.fn()
            const handler2 = vi.fn()
            bus.subscribe('mi:evento', handler1)
            bus.subscribe('mi:evento', handler2)

            await bus.publish([crearEvento('mi:evento')])

            expect(handler1).toHaveBeenCalledOnce()
            expect(handler2).toHaveBeenCalledOnce()
        })

        it('publica múltiples eventos en orden', async () => {
            const llamadas: string[] = []
            bus.subscribe('ev:uno', () => { llamadas.push('uno') })
            bus.subscribe('ev:dos', () => { llamadas.push('dos') })

            await bus.publish([crearEvento('ev:uno'), crearEvento('ev:dos')])

            expect(llamadas).toEqual(['uno', 'dos'])
        })

        it('no lanza si no hay handlers para un evento', async () => {
            await expect(bus.publish([crearEvento('sin:handler')])).resolves.not.toThrow()
        })

        it('continúa publicando otros eventos si un handler lanza error', async () => {
            const handlerFallido = vi.fn().mockRejectedValue(new Error('handler fallido'))
            const handlerOk = vi.fn()

            bus.subscribe('ev:uno', handlerFallido)
            bus.subscribe('ev:dos', handlerOk)

            await bus.publish([crearEvento('ev:uno'), crearEvento('ev:dos')])

            expect(handlerOk).toHaveBeenCalledOnce()
        })
    })

    describe('unsubscribe', () => {
        it('deja de llamar al handler después de unsubscribe', async () => {
            const handler = vi.fn()
            bus.subscribe('mi:evento', handler)
            bus.unsubscribe('mi:evento', handler)

            await bus.publish([crearEvento('mi:evento')])

            expect(handler).not.toHaveBeenCalled()
        })

        it('no lanza si se intenta unsubscribe de un evento sin handlers', () => {
            expect(() => bus.unsubscribe('sin:handler', vi.fn())).not.toThrow()
        })
    })

    describe('hasSubscribers', () => {
        it('retorna true si hay al menos un handler suscrito', () => {
            bus.subscribe('mi:evento', vi.fn())
            expect(bus.hasSubscribers('mi:evento')).toBe(true)
        })

        it('retorna false si no hay handlers', () => {
            expect(bus.hasSubscribers('sin:handler')).toBe(false)
        })

        it('retorna false después de unsubscribe del único handler', () => {
            const handler = vi.fn()
            bus.subscribe('mi:evento', handler)
            bus.unsubscribe('mi:evento', handler)
            expect(bus.hasSubscribers('mi:evento')).toBe(false)
        })
    })

    describe('clear', () => {
        it('elimina todos los handlers', async () => {
            const handler = vi.fn()
            bus.subscribe('mi:evento', handler)
            bus.clear()

            await bus.publish([crearEvento('mi:evento')])

            expect(handler).not.toHaveBeenCalled()
        })

        it('hasSubscribers retorna false después de clear', () => {
            bus.subscribe('mi:evento', vi.fn())
            bus.clear()
            expect(bus.hasSubscribers('mi:evento')).toBe(false)
        })
    })
})
