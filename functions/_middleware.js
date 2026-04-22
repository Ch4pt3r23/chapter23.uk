const PROTECTED_HOSTS = new Set(["preview.chapter23.uk"]);
const PRODUCTION_BRANCH = "main";
const DEFAULT_USER = "chapter23";

export async function onRequest(context) {
  const { request, env } = context;

  if (!shouldProtect(request, env)) {
    return context.next();
  }

  const username = env.PREVIEW_AUTH_USER || DEFAULT_USER;
  const password = env.PREVIEW_AUTH_PASSWORD;

  if (!password) {
    return new Response("Preview password is not configured.", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  if (await hasValidCredentials(request, username, password)) {
    return context.next();
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Chapter 23 preview"',
      "Cache-Control": "no-store",
    },
  });
}

function shouldProtect(request, env) {
  const hostname = new URL(request.url).hostname.toLowerCase();
  const branch = env.CF_PAGES_BRANCH || "";

  return PROTECTED_HOSTS.has(hostname) || (branch && branch !== PRODUCTION_BRANCH);
}

async function hasValidCredentials(request, username, password) {
  const authHeader = request.headers.get("Authorization") || "";

  if (!authHeader.startsWith("Basic ")) {
    return false;
  }

  const expected = `Basic ${btoa(`${username}:${password}`)}`;

  return timingSafeEqual(authHeader, expected);
}

async function timingSafeEqual(actual, expected) {
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);

  return byteLength(actual) === byteLength(expected) && buffersEqual(actualHash, expectedHash);
}

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}

function buffersEqual(left, right) {
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
  }

  return diff === 0;
}
