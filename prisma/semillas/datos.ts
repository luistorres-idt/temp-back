import bcrypt from 'bcryptjs';

// Generar un hash para el password. Aquí se usa el mismo hash para los usuarios de prueba. "Admin123!"
const defaultPasswordHash = bcrypt.hashSync("Admin123!", 10);

export const modulos = [
    { id: 1, nombre: "accion" },
    { id: 2, nombre: "modulo" },
    { id: 3, nombre: "operacion" },
    { id: 4, nombre: "permiso" },
    { id: 5, nombre: "perfil" },
    { id: 6, nombre: "usuario" },
    { id: 7, nombre: "cliente" },
    { id: 8, nombre: "sucursal" },
    { id: 9, nombre: "seccion" },
    { id: 10, nombre: "congelador" },
    { id: 11, nombre: "gateway" },
    { id: 12, nombre: "dispositivo" },
    { id: 13, nombre: "data" },
    { id: 14, nombre: "infoestatus" }
];

export const operaciones = [
    { id: 1, nombre: "crear" },
    { id: 2, nombre: "ver" },
    { id: 3, nombre: "editar" },
    { id: 4, nombre: "eliminar" }
];

// Arreglos generados dinámicamente
export const acciones: any[] = [];
export const permisos: any[] = [];

// 1. Generar todas las acciones combinando módulos y operaciones
let accionIdBase = 1;
for (const modulo of modulos) {
    for (const operacion of operaciones) {
        acciones.push({
            id: accionIdBase,
            nombre: `${operacion.nombre}-${modulo.nombre}`,
            moduloId: modulo.id,
            operacionId: operacion.id
        });
        accionIdBase++;
    }
}

// 2. Generar permisos para el Super Administrador (idPerfil: 1) de modo que tenga todas las acciones
for (const accion of acciones) {
    permisos.push({
        id: accion.id, // Reusamos el id de la acción para mayor sencillez en este ejemplo
        idPerfil: 1,
        idAccion: accion.id
    });
}

// 3. Generar algunos permisos específicos para el Usuario Final (idPerfil: 2)
// Buscamos las acciones que contengan la operación de "ver" y se apliquen a los módulos de dispositivos
let permisoIdCursor = acciones.length + 1;

const accionesUsuarioFinal = acciones.filter(
    (accion) => accion.nombre === "ver-dispositivo" || accion.nombre === "ver-data" || accion.nombre === "ver-infoestatus"
);

for (const accion of accionesUsuarioFinal) {
    permisos.push({
        id: permisoIdCursor,
        idPerfil: 2,
        idAccion: accion.id
    });
    permisoIdCursor++;
}

export const perfiles = [
    { id: 1, nombre: "superusuario" },
    { id: 2, nombre: "administrador" }
];

export const clientes = [
    { id: 1, nombre: "Carnes Finas El Torito" },
    { id: 2, nombre: "Lácteos del Valle" }
];

export const sucursales = [
    { id: 1, nombre: "Matriz Centro", idCliente: 1 },
    { id: 2, nombre: "Sucursal Norte", idCliente: 1 },
    { id: 3, nombre: "Bodega Principal", idCliente: 2 }
];

export const usuarios = [
    { id: 1, nombre: "admin", apellido: "Admin", correo: "admin@mail.com", password: defaultPasswordHash, idPerfil: 1 },
    { id: 2, nombre: "Juan", apellido: "Perez", correo: "juan@torito.com", password: defaultPasswordHash, idPerfil: 2, idCliente: 1 }
];

export const secciones = [
    { id: 1, nombre: "Área de Congelamiento 1", idSucursal: 1 },
    { id: 2, nombre: "Refrigeradores Mostrador", idSucursal: 1 }
];

export const congeladores = [
    { id: 1, nombre: "Congelador Carnes Rojas", idSeccion: 1, temperaturaObjetivo: -20.0 },
    { id: 2, nombre: "Vitrina Embutidos", idSeccion: 2, temperaturaObjetivo: -15.0 }
];

export const gateways = [
    { id: 1, identificador: "GW-MATRIZ-01", nombre: "Gateway Principal", idSeccion: 1 }
];

export const dispositivos = [
    { id: 1, nombre: "Sensor Temp Congelador 1", identificador: "00:1A:2B:3C:4D:5E", idGateway: 1, idCongelador: 1 },
    { id: 2, nombre: "Sensor Temp Vitrina 1", identificador: "00:1A:2B:3C:4D:5F", idGateway: 1, idCongelador: 2 }
];
