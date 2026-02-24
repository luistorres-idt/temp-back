const VALORES_BOOLEANOS_VERDADEROS = ["true", "1"];

interface PaginacionInput {
    elementos?: string;
    listado?: string;
    pagina?: string;
}

export class PaginacionDTO {
    static parse = ({ elementos = "8", listado = "false", pagina = "1" }: PaginacionInput) => {
        return {
            listado: VALORES_BOOLEANOS_VERDADEROS.includes(listado),
            pagina: parseInt(pagina) || 1,
            elementos: parseInt(elementos) || 8,
        };
    };
}
