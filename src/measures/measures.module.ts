import { Module } from '@nestjs/common';
import { MeasuresController } from './measures.controller';
import { MeasuresService } from './measures.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Measure } from './measure.entitty';
import { Customer } from 'src/customers/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Measure, Customer])],
  controllers: [MeasuresController],
  providers: [MeasuresService],
})
export class MeasuresModule {}
