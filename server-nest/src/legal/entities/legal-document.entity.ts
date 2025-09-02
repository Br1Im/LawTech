import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Office } from '../../office/entities/office.entity';

@Entity('legal_documents')
export class LegalDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  file_path: string;

  @Column({ nullable: true })
  file_name: string;

  @Column({ nullable: true })
  file_type: string;

  @Column({ default: 'draft' })
  status: string;

  @ManyToOne(() => User, { nullable: true })
  author: User;

  @Column({ nullable: true })
  author_id: number;

  @ManyToOne(() => Office, { nullable: true })
  office: Office;

  @Column({ nullable: true })
  office_id: number;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date;
}