import { ApiExtraModels, ApiProperty } from "@nestjs/swagger";
import { IdentificationTypeDTO } from "./identification.type.dto";

@ApiExtraModels(IdentificationTypeDTO)
export class IdentificationTypeMapDTO {
  @ApiProperty({
    type: "object",
    additionalProperties: {
      type: "array",
      items: {
        $ref: IdentificationTypeDTO.name,
      },
    },
  })
  [identificationTypes:string]: IdentificationTypeDTO[];
}
