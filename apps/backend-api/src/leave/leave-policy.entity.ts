import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class LeavePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  role: string;

  @Column()
  annualLeaveDays: number;

  @Column({ default: 0 })
  sickLeaveDays: number;

  @Column({ default: 0 })
  maternityLeaveDays: number;

  @Column({ default: true })
  isActive: boolean;
}