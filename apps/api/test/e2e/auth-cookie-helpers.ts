/**
 * E2E auth cookie helpers.
 *
 * Context:
 *   The API returns auth tokens only via httpOnly `Set-Cookie` headers
 *   (`access_token`, `refresh_token`). Login/register/refresh responses no
 *   longer include tokens in the JSON body. See `auth.controller.ts`
 *   (`setAuthCookies`, `toAuthResponseBody`).
 *
 *   Supertest does not persist cookies between independent `request(app)`
 *   calls, so specs that need to act as an authenticated user must read the
 *   tokens out of the login response's `Set-Cookie` header themselves and
 *   replay them on follow-up requests (either as a `Cookie` header or as
 *   `Authorization: Bearer <jwt>` while the strategy still accepts the
 *   bearer fallback).
 *
 *   These helpers exist so every spec does not re-implement the same
 *   `Set-Cookie` parsing inline.
 *
 * Used by:
 *   - test/e2e/auth.e2e-spec.ts
 *   - test/e2e/vouchers.e2e-spec.ts
 *   - test/e2e/drops.spec.ts
 *   - test/e2e/security.spec.ts
 *   - test/e2e/flows.spec.ts
 */

/**
 * Normalizes the `Set-Cookie` header value into an array.
 *
 * Node/Express may expose `Set-Cookie` as a single string when only one
 * cookie was set, or as a string array when multiple cookies were set.
 * All other helpers in this file rely on the array form.
 */
function normalizeSetCookie(
  setCookie: string | string[] | undefined,
): string[] {
  if (setCookie == null) return [];
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

/**
 * Extracts the value of a single named cookie from a `Set-Cookie` header.
 *
 * Returns `null` when the header is missing or does not contain a cookie
 * with the given name. Attributes (`Path`, `HttpOnly`, `SameSite`, ...)
 * are discarded — only the `name=value` pair is parsed.
 *
 * @example
 *   const accessToken = parseCookieFromSetCookie(
 *     loginRes.headers["set-cookie"],
 *     "access_token",
 *   );
 */
export function parseCookieFromSetCookie(
  setCookie: string | string[] | undefined,
  name: string,
): string | null {
  const lines = normalizeSetCookie(setCookie);
  if (!lines.length) return null;
  for (const line of lines) {
    const part = line.split(";")[0]!;
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const cookieName = part.slice(0, eq);
    if (cookieName !== name) continue;
    return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

/**
 * Builds a request-side `Cookie` header string from a response's
 * `Set-Cookie` header.
 *
 * Useful for replaying the auth cookies on a follow-up supertest request
 * without relying on a cookie jar:
 *
 * @example
 *   const cookieHeader = cookieHeaderFromSetCookie(
 *     loginRes.headers["set-cookie"],
 *   );
 *   await request(app.getHttpServer())
 *     .get("/api/v1/merchants/me")
 *     .set("Cookie", cookieHeader)
 *     .expect(200);
 */
export function cookieHeaderFromSetCookie(
  setCookie: string | string[] | undefined,
): string {
  const lines = normalizeSetCookie(setCookie);
  if (!lines.length) return "";
  return lines.map((c) => c.split(";")[0]!.trim()).join("; ");
}

/**
 * Shortcut for pulling the `access_token` JWT out of a `Set-Cookie` header.
 *
 * Primarily used by non-auth specs that prefer to authenticate follow-up
 * requests via `Authorization: Bearer <jwt>` instead of replaying the full
 * cookie. Returns `null` when the cookie is absent (e.g. failed login).
 */
export function accessTokenFromSetCookie(
  setCookie: string | string[] | undefined,
): string | null {
  return parseCookieFromSetCookie(setCookie, "access_token");
}

/**
 * Shortcut for pulling the `refresh_token` out of a `Set-Cookie` header.
 *
 * Used by auth specs that exercise `POST /auth/refresh` and `POST /auth/logout`
 * without going through the browser cookie jar.
 */
export function refreshTokenFromSetCookie(
  setCookie: string | string[] | undefined,
): string | null {
  return parseCookieFromSetCookie(setCookie, "refresh_token");
}
