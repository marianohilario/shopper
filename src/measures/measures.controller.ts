import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { MeasuresService } from './measures.service';
import { CreateMeasureDto } from './dto/create-measure.dto/create-measure.dto';
import { UUID } from 'crypto';

@Controller('measures')
export class MeasuresController {
  constructor(private readonly measuresService: MeasuresService) {}

  @HttpCode(HttpStatus.OK)
  @Post('upload')
  async createMeasure(@Body() createMeasureDto: CreateMeasureDto) {
    return this.measuresService.createMeasure(createMeasureDto);
  }

  @Patch('confirm')
  async confirmMeasure() {}

  @Get('images/:id')
  async getImages(@Param('id') id: UUID) {
    return this.measuresService.getImages(id);
  }
}
