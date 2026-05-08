import { next } from "@vercel/functions";

const env = globalThis.process?.env || {};
const USERNAME = env.AUTH_USER;
const PASSWORD = env.AUTH_PASS;

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
  if (!USERNAME || !PASSWORD) {
    return new Response("Autenticacao nao configurada", {
      status: 500,
      headers: {
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow, noarchive",
      },
    });
  }

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
