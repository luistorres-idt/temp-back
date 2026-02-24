const VALORES_FALSOS = ["false", "0"];

interface QueryInput {
    estatus?: string;
    nombre?: string;
    identificador?: string;
    fecha?: string;
    correo?: string;
    apellido?: string;
    [key: string]: string | undefined;
}

export class QueryDTO {
    static parse = (input: QueryInput) => {
        const { estatus, nombre, identificador, fecha, correo, apellido, ...rest } = input;

        return {
            estatus: estatus !== undefined ? !VALORES_FALSOS.includes(estatus) : true,
            nombre,
            identificador,
            fecha,
            correo,
            apellido,
            ...rest,
        };
    };
}
