import { prisma } from '../src/config/db.js';
import { modulos, operaciones, acciones, perfiles, permisos, usuarios, clientes, sucursales, secciones, congeladores, gateways, dispositivos } from './semillas/datos.js';

async function main() {
    console.log('Iniciando el proceso de seeding...');

    // 1. Crear Módulos
    for (const modulo of modulos) {
        await prisma.modulo.upsert({
            where: { id: modulo.id },
            update: {},
            create: modulo,
        });
    }
    console.log('- Módulos creados/verificados');

    // 2. Crear Operaciones
    for (const operacion of operaciones) {
        await prisma.operacion.upsert({
            where: { id: operacion.id },
            update: {},
            create: operacion,
        });
    }
    console.log('- Operaciones creadas/verificadas');

    // 3. Crear Acciones
    for (const accion of acciones) {
        await prisma.accion.upsert({
            where: { id: accion.id },
            update: {},
            create: accion,
        });
    }
    console.log('- Acciones creadas/verificadas');

    // 4. Crear Perfiles
    for (const perfil of perfiles) {
        await prisma.perfil.upsert({
            where: { id: perfil.id },
            update: {},
            create: perfil,
        });
    }
    console.log('- Perfiles creados/verificados');

    // 5. Crear Permisos
    for (const permiso of permisos) {
        await prisma.permiso.upsert({
            where: { id: permiso.id },
            update: {},
            create: permiso,
        });
    }
    console.log('- Permisos creados/verificados');

    // 6. Crear Clientes
    for (const cliente of clientes) {
        await prisma.cliente.upsert({
            where: { id: cliente.id },
            update: {},
            create: cliente,
        });
    }
    console.log('- Clientes creados/verificados');

    // 7. Crear Sucursales
    for (const sucursal of sucursales) {
        await prisma.sucursal.upsert({
            where: { id: sucursal.id },
            update: {},
            create: sucursal,
        });
    }
    console.log('- Sucursales creadas/verificadas');

    // 8. Crear Usuarios
    for (const usuario of usuarios) {
        // Asegurarse de utilizar el hash o password predefinido en "datos.ts"
        await prisma.usuario.upsert({
            where: { id: usuario.id },
            update: {},
            create: usuario,
        });
    }
    console.log('- Usuarios creados/verificados');

    // 9. Crear Secciones
    for (const seccion of secciones) {
        await prisma.seccion.upsert({
            where: { id: seccion.id },
            update: {},
            create: seccion,
        });
    }
    console.log('- Secciones creadas/verificadas');

    // 10. Crear Congeladores
    for (const congelador of congeladores) {
        await prisma.congelador.upsert({
            where: { id: congelador.id },
            update: {},
            create: congelador,
        });
    }
    console.log('- Congeladores creados/verificados');

    // 11. Crear Gateways
    for (const gateway of gateways) {
        await prisma.gateway.upsert({
            where: { id: gateway.id },
            update: {},
            create: gateway,
        });
    }
    console.log('- Gateways creados/verificados');

    // 12. Crear Dispositivos
    for (const dispositivo of dispositivos) {
        await prisma.dispositivo.upsert({
            where: { id: dispositivo.id },
            update: {},
            create: dispositivo,
        });
    }
    console.log('- Dispositivos creados/verificados');

    console.log('✅ Seeding completado con éxito.');
}

main()
    .catch((e) => {
        console.error('Error durante el seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
