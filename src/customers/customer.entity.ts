import { Measure } from 'src/measures/measure.entitty';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => Measure, (measure) => measure.customer)
  measures: Measure[];
}
