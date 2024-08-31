import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MeasuresService } from './measures.service';
import { CreateMeasureDto } from './dto/create-measure.dto';
import { UUID } from 'crypto';
import { ConfirmMeasureDto } from './dto/confirm-measure.dto';

@Controller('measures')
export class MeasuresController {
  constructor(private readonly measuresService: MeasuresService) {}

  @HttpCode(HttpStatus.OK)
  @Post('upload')
  async createMeasure(@Body() createMeasureDto: CreateMeasureDto) {
    return this.measuresService.createMeasure(createMeasureDto);
  }

  @Patch('confirm')
  async confirmMeasure(@Body() confirmMeasureDto: ConfirmMeasureDto) {
    return this.measuresService.confirmMeasure(confirmMeasureDto);
  }

  @Get(':customer_code/list')
  async getMeasuresByCustomer(
    @Param('customer_code') customer_code: UUID,
    @Query('measure_type') measure_type: string,
  ) {
    return this.measuresService.getMeasuresByCustomer(
      customer_code,
      measure_type,
    );
  }

  @Get('images/:id')
  async getImages(@Param('id') id: UUID) {
    return this.measuresService.getImages(id);
  }
}
