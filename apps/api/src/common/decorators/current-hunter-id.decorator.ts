import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

export const CurrentHunterId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ resolvedHunterId?: string }>();
    const id = request.resolvedHunterId;
    if (!id) {
      throw new UnauthorizedException("Hunter context required");
    }
    return id;
  },
);
