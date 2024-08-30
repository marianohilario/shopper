import { IsString, IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class ConfirmMeasureDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  measure_uuid: string;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  confirmed_value: number;
}
