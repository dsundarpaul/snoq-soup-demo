import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Request } from "express";

/**
 * CSRF mitigation for cookie-based auth.
 *
 * Blocks mutating requests that look like classic cross-site form-submit
 * CSRF (a malicious site POSTing to our API while the browser attaches the
 * user's auth cookie).
 *
 * Allows the request when any of the following is true:
 *   1. Method is safe (GET / HEAD / OPTIONS).
 *   2. `Sec-Fetch-Site` is `same-origin`, `same-site`, or `none`. This
 *      header is set by the browser itself on every request and cannot be
 *      spoofed by page JavaScript, so it is a reliable trust signal.
 *   3. A non-empty `X-Requested-With` header is present. Cross-origin HTML
 *      forms cannot set custom request headers, so the mere presence of
 *      this header proves the request was issued by same-origin JS
 *      (fetch/XHR).
 *   4. NODE_ENV === "test" (e2e specs bypass this check).
 *
 * Rejects with 403 "Invalid request origin" otherwise.
 */
@Injectable()
export class RequireFetchHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    console.log("canActivate", process.env.NODE_ENV);
    if (process.env.NODE_ENV === "development") {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();
    console.log(method);
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return true;
    }
    console.log("did not return true on", method);

    const secFetchSite = req.headers["sec-fetch-site"];
    if (
      secFetchSite === "same-origin" ||
      secFetchSite === "same-site" ||
      secFetchSite === "none"
    ) {
      return true;
    }

    const xrw = req.headers["x-requested-with"];
    if (typeof xrw === "string" && xrw.length > 0) {
      return true;
    }

    throw new ForbiddenException("Invalid request origin");
  }
}
