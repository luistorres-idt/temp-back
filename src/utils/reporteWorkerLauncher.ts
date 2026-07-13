import { Worker } from "worker_threads";
import path from "path";

export function generarExcelAsync(workerData: {
    sucursalNombre: string;
    rawDatos: any[];
    timezone: string;
    isRango: boolean;
    fechaDia: string;
}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        let workerPath: string | URL;

        const isDev = process.argv[1]?.endsWith(".ts") || process.execArgv.join(" ").includes("tsx");

        if (typeof __dirname !== "undefined") {
            // Entorno CommonJS (transpilado por tsc en dist/)
            workerPath = path.join(
                __dirname,
                isDev ? "../workers/excelWorker.ts" : "../workers/excelWorker.js"
            );
        } else {
            // Entorno ESM (fallback / compatible con ESM puro)
            const getMetaUrl = new Function("return import.meta.url");
            const metaUrl = getMetaUrl();
            const isDevUrl = metaUrl.endsWith(".ts") || isDev;
            workerPath = new URL(
                isDevUrl ? "../workers/excelWorker.ts" : "../workers/excelWorker.js",
                metaUrl
            );
        }

        const worker = new Worker(workerPath, { workerData });

        worker.on("message", (msg) => {
            if (msg.status === "success") {
                resolve(Buffer.from(msg.buffer));
            } else {
                reject(new Error(msg.error || "Error desconocido en el Worker de Excel"));
            }
        });

        worker.on("error", (err) => {
            reject(err);
        });

        worker.on("exit", (code) => {
            if (code !== 0) {
                reject(new Error(`Worker de Excel finalizó con código de salida ${code}`));
            }
        });
    });
}
