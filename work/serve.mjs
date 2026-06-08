import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = normalize(join(import.meta.dirname, "..", "outputs"));
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mp4": "video/mp4", ".png": "image/png", ".glb": "model/gltf-binary" };

createServer(async (req, res) => {
  try {
    const path = req.url === "/" ? "index.html" : req.url.replace(/^\/+/, "");
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) throw new Error("Invalid path");
    const type = mime[extname(file)] || "application/octet-stream";
    if (extname(file) === ".mp4" && req.headers.range) {
      const { size } = await stat(file);
      const [startText, endText] = req.headers.range.replace("bytes=", "").split("-");
      const start = Number(startText);
      const end = endText ? Number(endText) : size - 1;
      res.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Type": type,
      });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { "Content-Type": type });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(4173, "127.0.0.1");
