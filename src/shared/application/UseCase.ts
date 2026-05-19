/**
 * Interfaz base para todos los casos de uso de la aplicacion.
 *
 * Cada caso de uso encapsula una operacion de negocio especifica.
 * El controlador HTTP solo traduce request/response y delega al use case.
 *
 * @template TRequest - Tipo del DTO de entrada.
 * @template TResponse - Tipo del DTO de salida.
 *
 * @example
 * ```ts
 * class CrearUsuario implements UseCase<CrearUsuarioDto, UsuarioResponseDto> {
 *     constructor(private readonly repo: IUsuarioRepository) {}
 *
 *     async execute(request: CrearUsuarioDto): Promise<UsuarioResponseDto> {
 *         // ... logica de negocio
 *     }
 * }
 * ```
 */
export interface UseCase<TRequest, TResponse> {
    execute(request: TRequest): Promise<TResponse>;
}
