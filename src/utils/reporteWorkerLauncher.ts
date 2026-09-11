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
        const isDev =
            process.argv[1]?.endsWith(".ts") ||
            process.execArgv.join(" ").includes("tsx");

        const workerPath = path.join(
            __dirname,
            isDev
                ? "../workers/excelWorker.ts"
                : "../workers/excelWorker.js"
        );

        console.log("========== EXCEL WORKER ==========");
        console.log("workerPath:", workerPath);
        console.log("isDev:", isDev);
        console.log("==================================");

        const worker = new Worker(
            `
                const { register } = require("tsx/cjs/api");

                register();

                require(${JSON.stringify(workerPath)});
            `,
            {
                eval: true,
                workerData,
            }
        );

        worker.on("message", (msg) => {
            if (msg.status === "success") {
                resolve(Buffer.from(msg.buffer));
            } else {
                reject(
                    new Error(
                        msg.error ||
                        "Error desconocido en el Worker de Excel"
                    )
                );
            }
        });

        worker.on("error", (err) => {
            console.error("Error del Excel Worker:", err);
            reject(err);
        });

        worker.on("exit", (code) => {
            if (code !== 0) {
                reject(
                    new Error(
                        `Worker de Excel finalizó con código de salida ${code}`
                    )
                );
            }
        });
    });
}