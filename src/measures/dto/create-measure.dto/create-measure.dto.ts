import {
  IsBase64,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateMeasureDto {
  @IsString()
  @IsNotEmpty()
  @IsBase64()
  image: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  customer_code: string;

  @IsDateString()
  @IsNotEmpty()
  measure_datetime: string;

  @IsString()
  @IsIn(['WATER', 'GAS'], {
    message: 'measure_type must be either WATER or GAS',
  })
  measure_type: 'WATER' | 'GAS';
}
