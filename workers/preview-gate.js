const DEFAULT_USER = "chapter23";
const DEFAULT_TARGET = "https://preview.chapter23.pages.dev";

export default {
  async fetch(request, env) {
    const username = env.PREVIEW_AUTH_USER || DEFAULT_USER;
    const password = env.PREVIEW_AUTH_PASSWORD;

    if (!password) {
      return new Response("Preview password is not configured.", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (!(await hasValidCredentials(request, username, password))) {
      return new Response("Authentication required.", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Chapter 23 preview"',
          "Cache-Control": "no-store",
        },
      });
    }

    const target = new URL(env.PREVIEW_TARGET_ORIGIN || DEFAULT_TARGET);
    const url = new URL(request.url);
    url.protocol = target.protocol;
    url.hostname = target.hostname;
    url.port = target.port;

    const headers = new Headers(request.headers);
    headers.set("Authorization", `Basic ${btoa(`${username}:${password}`)}`);

    return fetch(new Request(url, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    }));
  },
};

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
