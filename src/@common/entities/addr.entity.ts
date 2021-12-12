import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import AddrHistoryEntity from './addr-history.entity';

@Entity()
export default class AddrEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  addr: string;

  @Column()
  balance: string;

  @OneToMany(() => AddrHistoryEntity, (history: { addr: AddrEntity }) => history.addr)
  history: AddrHistoryEntity[];
}
