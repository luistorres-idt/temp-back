import type { IAmbienteProvider } from "../../domain/ports/IAmbienteProvider.js";

interface CacheEntry {
    temperatura: number;
    fetchedAt: number;
}

/**
 * Implementación de IAmbienteProvider con:
 * - Caché por ciudad (TTL 10 min, stale-while-revalidate)
 * - Refresh en background vía setImmediate — no bloquea peticiones entrantes
 * - Ciudad default: Hermosillo (hasta que esté disponible la dirección de sucursal)
 */
export class OpenWeatherAmbienteProvider implements IAmbienteProvider {
    private readonly CIUDAD_DEFAULT = "Hermosillo";
    private readonly TTL_MS = 10 * 60 * 1000;
    private readonly cache = new Map<string, CacheEntry>();
    private readonly pendingRefresh = new Set<string>();

    async obtenerAmbiente(ciudad?: string): Promise<number> {
        const city = ciudad ?? this.CIUDAD_DEFAULT;
        const cached = this.cache.get(city);

        if (cached) {
            if (this.estaViciada(cached) && !this.pendingRefresh.has(city)) {
                this.encolarRefresh(city);
            }
            return cached.temperatura;
        }

        // Sin caché: primer fetch, bloqueante (ocurre una sola vez por ciudad)
        return this.fetchYCachear(city);
    }

    private estaViciada(entry: CacheEntry): boolean {
        return Date.now() - entry.fetchedAt > this.TTL_MS;
    }

    private encolarRefresh(ciudad: string): void {
        this.pendingRefresh.add(ciudad);
        setImmediate(() => {
            this.fetchYCachear(ciudad).finally(() => this.pendingRefresh.delete(ciudad));
        });
    }

    private async fetchYCachear(ciudad: string): Promise<number> {
        try {
            const temperatura = await this.llamarOpenWeather(ciudad);
            this.cache.set(ciudad, { temperatura, fetchedAt: Date.now() });
            return temperatura;
        } catch (err) {
            console.error(`[AmbienteProvider] Error al obtener temperatura para "${ciudad}":`, err);
            // Si hay caché viciada, preferirla al fallback
            const cached = this.cache.get(ciudad);
            return cached?.temperatura ?? 0;
        }
    }

    private async llamarOpenWeather(ciudad: string): Promise<number> {
        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            throw new Error("OPENWEATHER_API_KEY no está configurada en las variables de entorno");
        }

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(ciudad)}&appid=${apiKey}&units=metric`;

        const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });

        if (!res.ok) {
            throw new Error(`OpenWeather respondió con status ${res.status} para "${ciudad} "`);
        }

        const body = (await res.json()) as { main: { temp: number } };
        return body.main.temp;
    }
}
