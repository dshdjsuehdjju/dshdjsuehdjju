import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

const resourceDirectory = fileURLToPath(
    new URL("../../../copilot-extension-directory/", import.meta.url),
);
const assets = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/index.html", ["index.html", "text/html; charset=utf-8"]],
    ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
    ["/resources.js", ["resources.js", "text/javascript; charset=utf-8"]],
    ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
]);
const servers = new Map();

async function startServer() {
    const server = createServer(async (request, response) => {
        if (request.method !== "GET" && request.method !== "HEAD") {
            response.writeHead(405, { Allow: "GET, HEAD" });
            response.end("Method not allowed");
            return;
        }

        let pathname;
        try {
            pathname = new URL(request.url, "http://127.0.0.1").pathname;
        } catch {
            response.writeHead(400);
            response.end("Bad request");
            return;
        }

        const asset = assets.get(pathname);
        if (!asset) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }

        let content;
        try {
            content = await readFile(join(resourceDirectory, asset[0]));
        } catch {
            response.writeHead(500);
            response.end("Unable to read directory asset");
            return;
        }

        response.writeHead(200, {
            "Content-Type": asset[1],
            "Content-Length": content.length,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
        });
        response.end(request.method === "HEAD" ? undefined : content);
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.removeListener("error", reject);
            resolve();
        });
    });

    const address = server.address();
    if (!address || typeof address === "string") {
        await new Promise((resolve) => server.close(resolve));
        throw new Error("Unable to determine the resource directory server port");
    }

    return { server, url: `http://127.0.0.1:${address.port}/` };
}

await joinSession({
    canvases: [
        createCanvas({
            id: "copilot-resource-directory",
            displayName: "拓展集 · 资源市场",
            description: "浏览当前仓库的 Copilot 资源目录，按分类和关键词筛选并查看来源与使用提示。",
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer();
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "拓展集 · 资源市场", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) return;
                servers.delete(ctx.instanceId);
                await new Promise((resolve, reject) => {
                    entry.server.close((error) => error ? reject(error) : resolve());
                });
            },
        }),
    ],
});
