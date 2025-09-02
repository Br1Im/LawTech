import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('offices')
export class Office {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  contact_phone: string;

  @Column({ nullable: true })
  work_phone2: string;

  @Column({ nullable: true })
  website: string;

  @Column({ default: 0 })
  revenue: number;

  @Column({ default: 0 })
  orders: number;

  @OneToMany(() => User, user => user.office)
  employees: User[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}