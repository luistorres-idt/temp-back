export interface IAmbienteProvider {
    // ciudad será la dirección de la sucursal cuando esté disponible
    obtenerAmbiente(ciudad?: string): Promise<number>;
}
