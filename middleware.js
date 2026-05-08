import { next } from "@vercel/functions";

const USERNAME = process.env.AUTH_USER || "wilderson@protonsconsultoria.com";
const PASSWORD = process.env.AUTH_PASS || "Protons1";

function unauthorized() {
  return new Response("Autenticacao obrigatoria", {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="Mensagens Digisac", charset="UTF-8"',
      "cache-control": "no-store",
    },
  });
}

function decodeBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) return null;

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator === -1) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export default function middleware(request) {
  const credentials = decodeBasicAuth(request.headers.get("authorization"));

  if (!credentials || credentials.username !== USERNAME || credentials.password !== PASSWORD) {
    return unauthorized();
  }

  return next({
    headers: {
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow, noarchive",
    },
  });
}
