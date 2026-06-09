import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = normalize(join(import.meta.dirname, "..", "outputs"));
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mp4": "video/mp4", ".png": "image/png", ".glb": "model/gltf-binary" };

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const path = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) throw new Error("Invalid path");
    const type = mime[extname(file)] || "application/octet-stream";
    const { size } = await stat(file);
    if (req.headers.range) {
      const [startText, endText] = req.headers.range.replace("bytes=", "").split("-");
      const start = Number(startText || 0);
      const end = endText ? Number(endText) : size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
        res.writeHead(416, { "Content-Range": `bytes */${size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Type": type,
      });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, {
      "Accept-Ranges": "bytes",
      "Content-Length": size,
      "Content-Type": type,
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(port, host);
