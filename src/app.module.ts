import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceConfig } from './config/data.source';
import { Measure } from './measures/measure.entitty';
import { Customer } from './customers/customer.entity';
import { CustomersModule } from './customers/customers.module';
import { MeasuresModule } from './measures/measures.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env`,
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      ...DataSourceConfig,
      entities: [Measure, Customer],
    }),
    TypeOrmModule.forFeature([Measure, Customer]),
    CustomersModule,
    MeasuresModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
