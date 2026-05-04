import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { firstValueFrom, Observable } from "rxjs";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    try {
      const result = super.canActivate(context);
      if (result instanceof Observable) {
        await firstValueFrom(result);
      } else {
        await Promise.resolve(result as boolean | Promise<boolean>);
      }
    } catch {
      /* invalid or missing JWT */
    }
    return true;
  }

  handleRequest<TUser>(
    _err: Error | null,
    user: TUser | false,
  ): TUser | undefined {
    if (!user) {
      return undefined;
    }
    return user as TUser;
  }
}
