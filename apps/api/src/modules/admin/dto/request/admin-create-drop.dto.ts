import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsMongoId } from "class-validator";
import { CreateDropDto } from "../../../drops/dto/request/create-drop.dto";

/**
 * DTO for admin to create a drop for any merchant.
 * Extends CreateDropDto with merchantId since admin can create drops
 * for any merchant, not just themselves.
 */
export class AdminCreateDropDto extends CreateDropDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Merchant ID to create the drop for",
  })
  @IsString()
  @IsMongoId()
  merchantId!: string;
}
