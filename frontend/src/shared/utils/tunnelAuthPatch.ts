/**
 * Patch for running behind a Basic-Auth protected tunnel (e.g. devinapps expose).
 * The tunnel consumes the `Authorization` header for its own Basic auth, so our
 * JWT Bearer token must be sent in a different header. Our nginx upstream
 * translates `X-Auth-Token` back to `Authorization: Bearer <token>` before
 * hitting the backend.
 */

const AUTH_HEADER = 'Authorization';
const TUNNEL_AUTH_HEADER = 'X-Auth-Token';

function extractBearer(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match ? match[1] : null;
}

function patchHeaders(headers: Headers): void {
  const auth = headers.get(AUTH_HEADER);
  const bearer = extractBearer(auth);
  if (bearer) {
    headers.set(TUNNEL_AUTH_HEADER, bearer);
    headers.delete(AUTH_HEADER);
  }
}

function patchPlainHeaderObject(obj: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === AUTH_HEADER.toLowerCase()) {
      const bearer = extractBearer(v);
      if (bearer) {
        out[TUNNEL_AUTH_HEADER] = bearer;
        continue;
      }
    }
    out[k] = v;
  }
  return out;
}

export function installTunnelAuthPatch(): void {
  if ((window as unknown as { __tunnelAuthPatched?: boolean }).__tunnelAuthPatched) return;
  (window as unknown as { __tunnelAuthPatched?: boolean }).__tunnelAuthPatched = true;

  // Patch window.fetch
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      if (init && init.headers) {
        if (init.headers instanceof Headers) {
          patchHeaders(init.headers);
        } else if (Array.isArray(init.headers)) {
          const patched: [string, string][] = [];
          for (const [k, v] of init.headers) {
            if (k.toLowerCase() === AUTH_HEADER.toLowerCase()) {
              const bearer = extractBearer(v);
              if (bearer) {
                patched.push([TUNNEL_AUTH_HEADER, bearer]);
                continue;
              }
            }
            patched.push([k, v]);
          }
          init.headers = patched;
        } else {
          init.headers = patchPlainHeaderObject(init.headers as Record<string, string>);
        }
      } else if (input instanceof Request) {
        const bearer = extractBearer(input.headers.get(AUTH_HEADER));
        if (bearer) {
          const newHeaders = new Headers(input.headers);
          newHeaders.delete(AUTH_HEADER);
          newHeaders.set(TUNNEL_AUTH_HEADER, bearer);
          input = new Request(input, { headers: newHeaders });
        }
      }
    } catch (e) {
      console.warn('[tunnelAuthPatch] fetch patch failed', e);
    }
    return originalFetch(input, init);
  };

  // Patch XMLHttpRequest.setRequestHeader (used by axios)
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string): void {
    if (name.toLowerCase() === AUTH_HEADER.toLowerCase()) {
      const bearer = extractBearer(value);
      if (bearer) {
        return originalSetRequestHeader.call(this, TUNNEL_AUTH_HEADER, bearer);
      }
    }
    return originalSetRequestHeader.call(this, name, value);
  };
}
