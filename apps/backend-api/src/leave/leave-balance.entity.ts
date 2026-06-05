import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../employee/user.entity';

@Entity()
export class LeaveBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.leaveBalances, {
    onDelete: 'CASCADE',
  })
  user: User;

  @Column()
  year: number;

  @Column({ default: 0 })
  totalDays: number;

  @Column({ default: 0 })
  usedDays: number;

  @Column({ default: 0 })
  remainingDays: number;
}