import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  @Index('idx_user_email')
  email: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ name: 'refresh_token', nullable: true, type: 'varchar', length: 255 })
  refreshToken?: string;

  //Automatically set when user is created
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  //Automatically updated when user is modified
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  //Soft delete
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
