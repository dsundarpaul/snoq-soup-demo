import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { DatabaseService } from "../../database/database.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Health check" })
  async check() {
    try {
      await this.database.merchants.findOne().lean().maxTimeMS(3000);
      return { status: "ok", timestamp: new Date().toISOString() };
    } catch {
      return {
        status: "error",
        timestamp: new Date().toISOString(),
        db: "unreachable",
      };
    }
  }
}
