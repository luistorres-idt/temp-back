/**
 * Nombres de perfil tal como se almacenan en la BD.
 * Usar estos para comparaciones por nombre en los middlewares.
 */
export const PERFILES = {
    SUPERUSUARIO: "superusuario",
    ADMINISTRADOR: "administrador",
    SUPERVISOR: "supervisor",
} as const;

/**
 * IDs de perfil tal como están definidos en la BD.
 * Usar estos para comparaciones jerárquicas (e.g. "puede ver perfiles de id mayor al suyo").
 */
export const PERFILES_ID = {
    SUPERUSUARIO: 1,
    ADMINISTRADOR: 2,
    SUPERVISOR: 3,
} as const;
