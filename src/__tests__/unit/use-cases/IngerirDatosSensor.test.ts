import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IngerirDatosSensor } from '../../../modules/monitoring/application/use-cases/IngerirDatosSensor.js'
import { EntityNotFoundError } from '../../../shared/domain/DomainError.js'
import type { IDataRepository, ComandoIngesta } from '../../../modules/monitoring/domain/repositories.js'
import type { IAmbienteProvider } from '../../../modules/monitoring/domain/ports/IAmbienteProvider.js'
import { EventBus } from '../../../shared/infrastructure/EventBus.js'

// ─── Fakes / Mocks ───────────────────────────────────────────────────────────

const crearAmbienteProviderFake = (): IAmbienteProvider => ({
    obtenerAmbiente: vi.fn().mockResolvedValue(28.5),
})

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
    let ambienteProvider: IAmbienteProvider
    let useCase: IngerirDatosSensor

    beforeEach(() => {
        // Reseteamos el EventBus singleton para aislar tests
        EventBus['instance'] = undefined as unknown as EventBus
        eventBus = EventBus.getInstance()
        vi.spyOn(eventBus, 'publish').mockResolvedValue(undefined)

        repo = crearRepoFake()
        ambienteProvider = crearAmbienteProviderFake()
        useCase = new IngerirDatosSensor(repo, eventBus, ambienteProvider)
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

        it('retorna guardados con el resultado de cada sensor procesado', async () => {
            const resultado = await useCase.execute(comandoValido())
            expect(resultado.guardados).toHaveLength(1)
            expect(resultado.guardados[0]).toHaveProperty('data')
            expect(resultado.guardados[0]).toHaveProperty('infoEstatus')
        })

        it('retorna noRegistrados vacío cuando todos los sensores están registrados', async () => {
            const resultado = await useCase.execute(comandoValido())
            expect(resultado.noRegistrados).toHaveLength(0)
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
            expect(resultado.guardados).toHaveLength(2)
            expect(resultado.noRegistrados).toHaveLength(0)
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

    // ── Sensores no registrados ─────────────────────────────────────────────

    describe('cuando un sensor no está registrado', () => {
        beforeEach(() => {
            vi.mocked(repo.buscarGatewayPorIdentificador).mockResolvedValue(gatewayFake)
            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(null)
                return fn(txRepo)
            })
        })

        it('no lanza error — devuelve el identificador en noRegistrados', async () => {
            const resultado = await useCase.execute(comandoValido())
            expect(resultado.noRegistrados).toContain('00:1A:2B:3C:4D:5E')
        })

        it('guardados queda vacío cuando ningún sensor está registrado', async () => {
            const resultado = await useCase.execute(comandoValido())
            expect(resultado.guardados).toHaveLength(0)
        })

        it('NO llama a persistirLectura si el dispositivo no existe', async () => {
            let persistirLecturaMock: ReturnType<typeof vi.fn>
            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(null)
                persistirLecturaMock = vi.mocked(txRepo.persistirLectura)
                return fn(txRepo)
            })

            await useCase.execute(comandoValido())
            expect(persistirLecturaMock!).not.toHaveBeenCalled()
        })

        it('NO publica eventos para sensores no registrados', async () => {
            await useCase.execute(comandoValido())
            const eventosPublicados = vi.mocked(eventBus.publish).mock.calls[0][0]
            expect(eventosPublicados).toHaveLength(0)
        })
    })

    describe('éxito parcial — mezcla de sensores registrados y no registrados', () => {
        it('guarda los registrados e ignora los no registrados', async () => {
            vi.mocked(repo.buscarGatewayPorIdentificador).mockResolvedValue(gatewayFake)

            const sensorRegistrado = sensorPayload()
            const sensorNoRegistrado = { ...sensorPayload(), identificador: 'FF:FF:FF:FF:FF:FF' }

            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockImplementation(
                    async (id) => id === sensorRegistrado.identificador ? dispositivoFake : null
                )
                vi.mocked(txRepo.persistirLectura).mockResolvedValue(lecturaFake)
                return fn(txRepo)
            })

            const comando: ComandoIngesta = {
                identificadorGateway: 'GW-001-ABC',
                sensores: [sensorRegistrado, sensorNoRegistrado],
            }

            const resultado = await useCase.execute(comando)

            expect(resultado.guardados).toHaveLength(1)
            expect(resultado.noRegistrados).toEqual(['FF:FF:FF:FF:FF:FF'])
        })

        it('publica eventos solo para los sensores guardados', async () => {
            vi.mocked(repo.buscarGatewayPorIdentificador).mockResolvedValue(gatewayFake)

            const sensorRegistrado = sensorPayload()
            const sensorNoRegistrado = { ...sensorPayload(), identificador: 'FF:FF:FF:FF:FF:FF' }

            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockImplementation(
                    async (id) => id === sensorRegistrado.identificador ? dispositivoFake : null
                )
                vi.mocked(txRepo.persistirLectura).mockResolvedValue(lecturaFake)
                return fn(txRepo)
            })

            const comando: ComandoIngesta = {
                identificadorGateway: 'GW-001-ABC',
                sensores: [sensorRegistrado, sensorNoRegistrado],
            }

            await useCase.execute(comando)

            const eventosPublicados = vi.mocked(eventBus.publish).mock.calls[0][0]
            expect(eventosPublicados).toHaveLength(1)
        })
    })

    // ── Sensores con código de error de batería baja (655.35) ─────────────────

    describe('cuando un sensor manda código de error 655.35 (bateria baja)', () => {
        beforeEach(() => {
            vi.mocked(repo.buscarGatewayPorIdentificador).mockResolvedValue(gatewayFake)
            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(dispositivoFake)
                vi.mocked(txRepo.persistirLectura).mockResolvedValue(lecturaFake)
                return fn(txRepo)
            })
        })

        it('no lo registra, no lo procesa y no lo devuelve en guardados o noRegistrados', async () => {
            const sensorNormal = sensorPayload()
            const sensorError = {
                ...sensorPayload(),
                identificador: '00:1A:2B:3C:4D:5F',
                data: { temperatura: 655.35, ambiente: 20.0 }
            }

            const comando: ComandoIngesta = {
                identificadorGateway: 'GW-001-ABC',
                sensores: [sensorNormal, sensorError],
            }

            const resultado = await useCase.execute(comando)

            // Solo el sensor normal debe guardarse
            expect(resultado.guardados).toHaveLength(1)
            expect(resultado.noRegistrados).toHaveLength(0)

            // El eventBus solo se debio haber llamado para el sensor normal (1 evento)
            const eventosPublicados = vi.mocked(eventBus.publish).mock.calls[0][0]
            expect(eventosPublicados).toHaveLength(1)
        })
    })

    // ── Resolución de ambiente ──────────────────────────────────────────────

    describe('resolución de temperatura ambiente', () => {
        beforeEach(() => {
            vi.mocked(repo.buscarGatewayPorIdentificador).mockResolvedValue(gatewayFake)
            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(dispositivoFake)
                vi.mocked(txRepo.persistirLectura).mockResolvedValue(lecturaFake)
                return fn(txRepo)
            })
        })

        it('usa el ambiente del sensor cuando viene en el payload', async () => {
            const comando: ComandoIngesta = {
                identificadorGateway: 'GW-001-ABC',
                sensores: [{ ...sensorPayload(), data: { temperatura: -18.5, ambiente: 22.3 } }],
            }

            await useCase.execute(comando)

            const txRepo = crearRepoFake()
            vi.mocked(txRepo.persistirLectura)
            expect(ambienteProvider.obtenerAmbiente).not.toHaveBeenCalled()
        })

        it('consulta el provider cuando ambiente es null', async () => {
            const comando: ComandoIngesta = {
                identificadorGateway: 'GW-001-ABC',
                sensores: [{ ...sensorPayload(), data: { temperatura: -18.5, ambiente: null } }],
            }

            await useCase.execute(comando)

            expect(ambienteProvider.obtenerAmbiente).toHaveBeenCalledOnce()
        })

        it('consulta el provider cuando ambiente es undefined', async () => {
            const comando: ComandoIngesta = {
                identificadorGateway: 'GW-001-ABC',
                sensores: [{ ...sensorPayload(), data: { temperatura: -18.5 } }],
            }

            await useCase.execute(comando)

            expect(ambienteProvider.obtenerAmbiente).toHaveBeenCalledOnce()
        })

        it('usa 0 como fallback si no hay provider y ambiente no viene', async () => {
            const useCaseSinProvider = new IngerirDatosSensor(repo, eventBus)
            let ambientePersistido: number | undefined

            vi.mocked(repo.ejecutarEnTransaccion).mockImplementation(async (fn) => {
                const txRepo = crearRepoFake()
                vi.mocked(txRepo.buscarDispositivoPorIdentificadorYGateway).mockResolvedValue(dispositivoFake)
                vi.mocked(txRepo.persistirLectura).mockImplementation(async (params) => {
                    ambientePersistido = params.ambiente as number
                    return lecturaFake
                })
                return fn(txRepo)
            })

            const comando: ComandoIngesta = {
                identificadorGateway: 'GW-001-ABC',
                sensores: [{ ...sensorPayload(), data: { temperatura: -18.5, ambiente: null } }],
            }

            await useCaseSinProvider.execute(comando)
            expect(ambientePersistido).toBe(0)
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
