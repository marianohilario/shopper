import { Customer } from 'src/customers/customer.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'measures' })
export class Measure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  imageUrl: string;

  @Column('float')
  measureValue: number;

  @Column()
  measureType: string;

  @Column()
  measureDatetime: Date;

  @Column({ default: false })
  hasConfirmed: boolean;

  @ManyToOne(() => Customer, (customer) => customer.measures)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
