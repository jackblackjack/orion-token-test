import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import AddrEntity from './addr.entity';

@Entity()
export default class AddrHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => AddrEntity, (addr: { id: number }) => addr.id)
  @JoinColumn({ name: 'addr_id' })
  addr: AddrEntity;

  @Column()
  addr_id: number;

  @Column()
  block: number;

  @Column()
  transaction: number;

  @Column()
  transactionAt: Date;

  @Column()
  usd: number;

  @Column()
  eur: number;

  @Column()
  volume: number;
}
