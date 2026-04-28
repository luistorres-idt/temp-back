import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IngerirDatosSensor } from '../../../modules/monitoring/application/use-cases/IngerirDatosSensor.js'
import { EntityNotFoundError, DomainError } from '../../../shared/domain/DomainError.js'
import type { IDataRepository, ComandoIngesta } from '../../../modules/monitoring/domain/repositories.js'
import { EventBus } from '../../../shared/infrastructure/EventBus.js'

// ─── Fakes / Mocks ───────────────────────────────────────────────────────────

/**
 * Repositorio falso que implementa IDataRepository.
 * Permite controlar las respuestas en cada test sin tocar la BD.
 */
const crearRepoFake = (): IDataRepository => ({
    buscarGatewayPorIdentificador: vi.fn(),
    buscarDispositivoPorIdentificadorYGateway: vi.fn(),
    persistirLectura: vi.fn(),
    ejecutarEnTransaccion: vi.fn(async (fn) => fn(crearRepoFake())),
})

const gatewayFake = { id: 1 }

const dispositivoFake = {
    id: 10,
    nombre: 'Sensor Temp #1',
    idCongelador: 5,
    congelador: {
        id: 5,
        seccion: {
            sucursal: { id: 3 },
        },
    },
}

const lecturaFake = {
    data: { id: 1, temperatura: -18.5, ambiente: 22.3, humedad: null, creado: new Date() },
    infoEstatus: { id: 1, bateria: 85.5, rssi: -70, snr: 10, creado: new Date() },
}

const sensorPayload = () => ({
    identificador: '00:1A:2B:3C:4D:5E',
    signal: { bateria: 85.5, rssi: -70, snr: 10 },
    data: { temperatura: -18.5, ambiente: 22.3 },
})

const comandoValido = (): ComandoIngesta => ({
    identificadorGateway: 'GW-001-ABC',
    sensores: [sensorPayload()],
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('IngerirDatosSensor - use case de ingesta IoT', () => {
    let repo: IDataRepository
    let eventBus: EventBus
    let useCase: IngerirDatosSensor

    beforeEach(() => {
        // Reseteamos el EventBus singleton para aislar tests
        EventBus['instance'] = undefined as unknown as EventBus
        eventBus = EventBus.getInstance()
        vi.spyOn(eventBus, 'publish').mockResolvedValue(undefined)

        repo = crearRepoFake()
        useCase = new IngerirDatosSensor(repo, eventBus)
    })

    // ── Happy Path ──────────────────────────────────────────────────────────

    describe('happy path', () => {
        beforeEach(() => {
            vi.mocked(repo.buscarGatewayPorIdentificador).mockResolvedValue(gatewayFake)
            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(dispositivoFake)
                vi.mocked(txRepo.persistirLectura).mockResolvedValue(lecturaFake)
                return fn(txRepo)
            })
        })

        it('retorna un array con el resultado de cada sensor procesado', async () => {
            const resultado = await useCase.execute(comandoValido())
            expect(resultado).toHaveLength(1)
            expect(resultado[0]).toHaveProperty('data')
            expect(resultado[0]).toHaveProperty('infoEstatus')
        })

        it('busca el gateway por identificador exacto', async () => {
            await useCase.execute(comandoValido())
            expect(repo.buscarGatewayPorIdentificador).toHaveBeenCalledWith('GW-001-ABC')
        })

        it('ejecuta la lógica dentro de una transacción', async () => {
            await useCase.execute(comandoValido())
            expect(repo.ejecutarEnTransaccion).toHaveBeenCalledOnce()
        })

        it('publica eventos de dominio al finalizar la transacción', async () => {
            await useCase.execute(comandoValido())
            expect(eventBus.publish).toHaveBeenCalledOnce()
            const eventosPublicados = vi.mocked(eventBus.publish).mock.calls[0][0]
            expect(Array.isArray(eventosPublicados)).toBe(true)
            expect(eventosPublicados).toHaveLength(1)
        })

        it('procesa múltiples sensores en un mismo comando', async () => {
            const sensor2 = { ...sensorPayload(), identificador: '00:1A:2B:3C:4D:5F' }
            const comando: ComandoIngesta = {
                identificadorGateway: 'GW-001-ABC',
                sensores: [sensorPayload(), sensor2],
            }

            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(dispositivoFake)
                vi.mocked(txRepo.persistirLectura).mockResolvedValue(lecturaFake)
                return fn(txRepo)
            })

            const resultado = await useCase.execute(comando)
            expect(resultado).toHaveLength(2)
        })

        it('publica un evento por cada sensor procesado', async () => {
            const sensor2 = { ...sensorPayload(), identificador: '00:1A:2B:3C:4D:5F' }
            const comando: ComandoIngesta = {
                identificadorGateway: 'GW-001-ABC',
                sensores: [sensorPayload(), sensor2],
            }

            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(dispositivoFake)
                vi.mocked(txRepo.persistirLectura).mockResolvedValue(lecturaFake)
                return fn(txRepo)
            })

            await useCase.execute(comando)
            const eventosPublicados = vi.mocked(eventBus.publish).mock.calls[0][0]
            expect(eventosPublicados).toHaveLength(2)
        })
    })

    // ── Error Path: Gateway ─────────────────────────────────────────────────

    describe('cuando el gateway no existe', () => {
        beforeEach(() => {
            vi.mocked(repo.buscarGatewayPorIdentificador).mockResolvedValue(null)
        })

        it('lanza EntityNotFoundError', async () => {
            await expect(useCase.execute(comandoValido())).rejects.toBeInstanceOf(EntityNotFoundError)
        })

        it('el error tiene httpStatus 404', async () => {
            try {
                await useCase.execute(comandoValido())
            } catch (err) {
                expect((err as EntityNotFoundError).httpStatus).toBe(404)
            }
        })

        it('el error incluye el identificador del gateway en el mensaje', async () => {
            try {
                await useCase.execute(comandoValido())
            } catch (err) {
                expect((err as EntityNotFoundError).message).toContain('GW-001-ABC')
            }
        })

        it('NO llama a ejecutarEnTransaccion si el gateway no existe', async () => {
            await expect(useCase.execute(comandoValido())).rejects.toThrow()
            expect(repo.ejecutarEnTransaccion).not.toHaveBeenCalled()
        })

        it('NO publica eventos si el gateway no existe', async () => {
            await expect(useCase.execute(comandoValido())).rejects.toThrow()
            expect(eventBus.publish).not.toHaveBeenCalled()
        })
    })

    // ── Error Path: Dispositivo ─────────────────────────────────────────────

    describe('cuando el dispositivo no existe', () => {
        beforeEach(() => {
            vi.mocked(repo.buscarGatewayPorIdentificador).mockResolvedValue(gatewayFake)
            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(null)
                return fn(txRepo)
            })
        })

        it('lanza DomainError con code DISPOSITIVO_NO_ENCONTRADO', async () => {
            try {
                await useCase.execute(comandoValido())
                expect.fail('debería haber lanzado un error')
            } catch (err) {
                expect(err).toBeInstanceOf(DomainError)
                expect((err as DomainError).code).toBe('DISPOSITIVO_NO_ENCONTRADO')
            }
        })

        it('el error tiene httpStatus 404', async () => {
            try {
                await useCase.execute(comandoValido())
            } catch (err) {
                expect((err as DomainError).httpStatus).toBe(404)
            }
        })

        it('el mensaje incluye el identificador del sensor', async () => {
            try {
                await useCase.execute(comandoValido())
            } catch (err) {
                expect((err as DomainError).message).toContain('00:1A:2B:3C:4D:5E')
            }
        })

        it('NO llama a persistirLectura si el dispositivo no existe', async () => {
            let persistirLecturaMock: ReturnType<typeof vi.fn>
            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(null)
                persistirLecturaMock = vi.mocked(txRepo.persistirLectura)
                return fn(txRepo)
            })

            await expect(useCase.execute(comandoValido())).rejects.toThrow()
            expect(persistirLecturaMock!).not.toHaveBeenCalled()
        })
    })

    // ── Error Path: Repositorio ─────────────────────────────────────────────

    describe('cuando el repositorio falla', () => {
        it('propaga el error si buscarGatewayPorIdentificador lanza una excepción', async () => {
            vi.mocked(repo.buscarGatewayPorIdentificador).mockRejectedValue(new Error('DB connection lost'))

            await expect(useCase.execute(comandoValido())).rejects.toThrow('DB connection lost')
        })

        it('propaga el error si persistirLectura lanza una excepción', async () => {
            vi.mocked(repo.buscarGatewayPorIdentificador).mockResolvedValue(gatewayFake)
            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(dispositivoFake)
                vi.mocked(txRepo.persistirLectura).mockRejectedValue(new Error('DB write error'))
                return fn(txRepo)
            })

            await expect(useCase.execute(comandoValido())).rejects.toThrow('DB write error')
        })
    })
})
