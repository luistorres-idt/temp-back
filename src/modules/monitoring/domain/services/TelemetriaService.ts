import type { CongeladorConDispositivos, SeccionConCongeladores } from "../repositories.js";

/**
 * Servicio de dominio para calculos de telemetria.
 *
 * Encapsula la logica de calculo de promedios de temperatura y ambiente
 * que antes vivia en SeccionesController.inyectarPromedios().
 *
 * Al ser un servicio de dominio puro (sin dependencias de infraestructura),
 * es trivialmente testeable con datos in-memory.
 */
export class TelemetriaService {
    /**
     * Calcula promedios de temperatura y ambiente para cada congelador
     * de una seccion, basandose en los datos de sus dispositivos activos.
     */
    static calcularPromediosSeccion(seccion: SeccionConCongeladores): SeccionConCongeladores {
        if (!seccion.congeladores) return seccion;

        seccion.congeladores.forEach((congelador) => {
            TelemetriaService.calcularPromediosCongelador(congelador);
        });

        return seccion;
    }

    /**
     * Calcula los promedios para un congelador individual.
     * Modifica el objeto in-place y lo retorna.
     */
    static calcularPromediosCongelador(congelador: CongeladorConDispositivos): CongeladorConDispositivos {
        const dispositivos = congelador.dispositivos ?? [];
        congelador.dispositivosTotales = dispositivos.length;

        // Dispositivos activos = los que tienen datos en las ultimas 24h
        const activos = dispositivos.filter(d => d.data && d.data.length > 0);
        congelador.dispositivosActivos = activos.length;

        if (activos.length > 0) {
            let sumTemp = 0;
            let sumAmbiente = 0;
            let totalRegistros = 0;
            let fechaMasReciente: Date | null = null;

            activos.forEach((dispositivo) => {
                dispositivo.data.forEach((d) => {
                    sumTemp += d.temperatura;
                    sumAmbiente += d.ambiente;
                    totalRegistros++;
                });
                const primeraFecha = dispositivo.data[0].creado;
                if (!fechaMasReciente || primeraFecha > fechaMasReciente) {
                    fechaMasReciente = primeraFecha;
                }
            });

            congelador.temperaturaPromedio = Number((sumTemp / totalRegistros).toFixed(1));
            congelador.ambientePromedio = Number((sumAmbiente / totalRegistros).toFixed(1));
            congelador.ultimaLectura = fechaMasReciente;
        } else {
            congelador.temperaturaPromedio = null;
            congelador.ambientePromedio = null;
            congelador.ultimaLectura = null;
        }

        return congelador;
    }
}
