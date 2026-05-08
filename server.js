const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const startPort = Number(process.env.PORT || 4173);
const portFile = path.join(root, ".server-port");
const username = process.env.AUTH_USER || "wilderson@protonsconsultoria.com";
const password = process.env.AUTH_PASS || "Protons1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".oga": "audio/ogg",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": type });
  res.end(body);
}

function authorized(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator === -1) return false;
    return decoded.slice(0, separator) === username && decoded.slice(separator + 1) === password;
  } catch {
    return false;
  }
}

function requireAuth(res) {
  res.writeHead(401, {
    "www-authenticate": 'Basic realm="Mensagens Digisac", charset="UTF-8"',
    "cache-control": "no-store",
  });
  res.end("Autenticacao obrigatoria");
}

function createServer() {
  return http.createServer((req, res) => {
    if (!authorized(req)) {
      requireAuth(res);
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const decodedPath = decodeURIComponent(url.pathname);
    const requestPath = decodedPath === "/" ? "/index.html" : decodedPath;
    const filePath = path.normalize(path.join(root, requestPath));

    if (!filePath.startsWith(root)) {
      send(res, 403, "Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        send(res, 404, "Not found");
        return;
      }
      send(res, 200, data, types[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    });
  });
}

function listen(port) {
  const server = createServer();
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < startPort + 20) {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, "127.0.0.1", () => {
    fs.writeFileSync(portFile, String(port), "utf8");
    console.log(`Digisac Viewer: http://127.0.0.1:${port}`);
  });
}

listen(startPort);
