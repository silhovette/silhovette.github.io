import http from "node:http";
import { createReadStream } from "node:fs";
import { readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = fileURLToPath(new URL("../", import.meta.url));
const imagePattern = /\.(jpe?g|png|webp|avif|gif)$/i;
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".png": "image/png", ".avif": "image/avif",
  ".gif": "image/gif", ".woff2": "font/woff2", ".ttf": "font/ttf", ".mp3": "audio/mpeg",
};

export async function listPhotos(root = defaultRoot) {
  const photos = [];
  async function visit(relative) {
    let entries;
    try { entries = await readdir(path.join(root, relative), { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory() && entry.name !== "thumbs") await visit(child);
      else if (entry.isFile() && imagePattern.test(entry.name)) photos.push({ path: child });
    }
  }
  await visit("assets/photos");
  const compare = new Intl.Collator("en", { numeric: true, sensitivity: "base" }).compare;
  return photos.sort((a, b) => compare(a.path, b.path));
}

export async function createPreviewServer({ root = defaultRoot } = {}) {
  const base = await realpath(root);
  return http.createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-cache");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405); response.end(); return;
    }
    try {
      const url = new URL(request.url, "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === "/assets/photos/index.json") {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(request.method === "HEAD" ? undefined : JSON.stringify({ photos: await listPhotos(base) }));
        return;
      }
      const parts = pathname.split(/[\\/]+/).filter(Boolean);
      if (parts.some(part => part.startsWith(".")) || pathname.includes("\0")) {
        response.writeHead(404); response.end(); return;
      }
      let file = path.resolve(base, ...parts);
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      file = await realpath(file);
      if (!file.startsWith(base + path.sep)) {
        response.writeHead(404); response.end(); return;
      }
      const info = await stat(file);
      if (!info.isFile()) { response.writeHead(404); response.end(); return; }
      response.setHeader("Content-Type", types[path.extname(file).toLowerCase()] || "application/octet-stream");
      response.setHeader("Content-Length", info.size);
      if (request.method === "HEAD") response.end();
      else createReadStream(file).on("error", () => response.destroy()).pipe(response);
    } catch (error) {
      response.writeHead(error.code === "ENOENT" || error.code === "ENOTDIR" ? 404 : 400);
      response.end("Not available");
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createPreviewServer();
  const firstPort = Number(process.argv[2] || 8766);
  server.once("listening", () => {
    console.log(`Preview: http://127.0.0.1:${server.address().port}/playground.html#photography`);
  });
  function listen(port) {
    server.once("error", error => {
      if (error.code === "EADDRINUSE" && port < firstPort + 20) listen(port + 1);
      else { console.error(error.message); process.exit(1); }
    });
    server.listen(port, "127.0.0.1");
  }
  listen(firstPort);
}
