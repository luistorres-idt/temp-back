import cors from "cors";

const TODOS = ["*"];

export class CORSMiddleware {
    static execute = ({ origenes = TODOS }: { origenes?: string[] } = {}) => {
        if (origenes === TODOS) return cors();

        return cors({
            origin: (origin, callback) => {
                if (!origin || origenes.includes(origin)) return callback(null, true);
                return callback(new Error("Error de CORS"));
            },
        });
    };
}
