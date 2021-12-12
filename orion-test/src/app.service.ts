import { DateTime, Settings } from 'luxon';
import { Repository } from 'typeorm';
import { default as Web3 } from 'web3';
import { Transaction } from 'web3-core';

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { AddAddrDto } from './@common/dto/add-addr.dto';
import AddrHistoryEntity from './@common/entities/addr-history.entity';
import AddrEntity from './@common/entities/addr.entity';
import { BinanceService } from './binance/binance.service';
//import { IQueryGetBalance } from './@common/query-get-balance.interface';
import {
    CONFIG_ENV_OPTIONS_REGISTER_AS, CONFIG_INFURA_OPTIONS_SERVICE_REGISTER_AS, INTERVAL_HARVEST_TRANSACTIONS_SEC, WEB3_PROVIDER_ID,
} from './config/constants';
import { IEnvOptions } from './config/interfaces/env-options.interface';
import { IInfuraOptions } from './config/interfaces/infura-options.interface';
import { EthService } from './eth/eth.service';
import { precisionFormat } from './utils/precisionFormat.util';
import { IQueryGetBalance } from './@common/query-get-balance.interface';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  private harvestingSemafor: boolean = false;
  private addrBlock: Map<string, number> = new Map<string, number>();

  constructor(
    @Inject(WEB3_PROVIDER_ID) private readonly web3: Web3,
    private readonly configService: ConfigService,
    private readonly ethService: EthService,
    private readonly binanceService: BinanceService,
    @InjectRepository(AddrEntity) private addrRepository: Repository<AddrEntity>,
    @InjectRepository(AddrHistoryEntity) private addrHistoryRepository: Repository<AddrHistoryEntity>,
  ) {}

  async onModuleInit() {
    // Fetch enviroment.
    const envOptions = this.configService.get<IEnvOptions>(CONFIG_ENV_OPTIONS_REGISTER_AS);

    // Set default timezone for luxon.
    Settings.defaultZone = envOptions?.timeZone ?? "UTC";

    // Set start block num for fetch.
    const items = await this.addrRepository.createQueryBuilder('addr')
      .select('addr.addr')
      .leftJoin('addr.history', 'history')
      .addSelect(['history.block'])
      .orderBy('history.block', 'DESC')
      .getMany();

    if (items.length) {
      const infuraOptions = this.configService.get<IInfuraOptions>(CONFIG_INFURA_OPTIONS_SERVICE_REGISTER_AS);
      items.map((addr) => {
        if (addr.history.length) {
          this.addrBlock.set(addr.addr, addr.history[0].block + 1);
        } else {
          this.addrBlock.set(addr.addr, infuraOptions?.startBlockNum ?? 0);
        }
      });
    }
  }

  /**
   * Add new addr to monitoring.
   *
   * @param {AddAddrDto} addrDto
   * @returns {Promise<AddrEntity>}
   *
   * @memberOf AppService
   */
  async addAddr(addrDto: AddAddrDto): Promise<AddrEntity> {
    let item = await this.addrRepository.findOne({ where: { addr: addrDto.addr }});

    if (item) {
      throw new Error(`Address ${item.addr} already added at ${item.createdAt}`);
    }

    let balance = '0';
    try {
      balance = await this.ethService.getBalance(addrDto.addr);
    } catch(error) {
      throw new Error(`Erro while get actual balance for addr ${addrDto.addr}`);
    }

    item = await this.addrRepository.save(
      this.addrRepository.create({ addr: addrDto.addr, balance  }));

    const infuraOptions = this.configService.get<IInfuraOptions>(CONFIG_INFURA_OPTIONS_SERVICE_REGISTER_AS);
    this.addrBlock.set(addrDto.addr, infuraOptions?.startBlockNum ?? 0);

    return item;
  }

  /**
   * Build stats queries and returns it.
   *
   * @param {IQueryGetBalance} query
   * @returns {Promise<AddrEntity>}
   *
   * @memberOf AppService
   */
  async getStats(query: IQueryGetBalance): Promise<AddrHistoryEntity[]> {
    const { addr, from, to, currency } = query;
    this.logger.debug(`Fetch stats by query: ${JSON.stringify(query)}`);
    const defaultColumns = [ 'addr.addr', 'history.transactionAt', ...currency.map((n) => 'history'.concat('.', n.toLowerCase()))];
    const sqlQuery = this.addrHistoryRepository
                    .createQueryBuilder('history')
                    .select(defaultColumns)
                    .innerJoin('history.addr', 'addr', 'addr.addr = :addr', { addr })
                    .orderBy('history.transactionAt', 'DESC');

    if (from || to) {
      if (from && to) {
        sqlQuery.where('history.transactionAt BETWEEN :start AND :finish', {
          start: from?.toLocaleString(), finish: to.toLocaleString()
        });
      } else if (from) {
        sqlQuery.where('history.transactionAt >= :start', { start: from?.toLocaleString() });
      } else if (to) {
        sqlQuery.where('history.transactionAt <= :finish', { finish: to.toLocaleString() });
      }
    }

    this.logger.debug(`Fetch stats by query: ${JSON.stringify(query)}: ${sqlQuery.getSql()}`);

    return sqlQuery.getMany();
  }

  /**
   * Add transaction details to database.
   *
   * @private
   * @param {number} timestamp
   * @param {Transaction} transaction
   * @param {AddrEntity} addr
   * @returns {Promise<boolean>}
   *
   * @memberOf AppService
   */
  private async addTransaction(timestamp: number, transaction: Transaction, addr: AddrEntity): Promise<boolean> {
    try {
      // Seek that transaction already exists.
      const existsTransaction = await this.addrHistoryRepository.findOne({ where: {
        addr_id: addr.id,
        block: transaction.blockNumber,
        transaction: transaction.transactionIndex,
      }})

      if (existsTransaction) {
        return false;
      }

      // Define the time of transaction.
      const transactionDt = DateTime.fromSeconds(timestamp);
      this.logger.debug(`Add transaction at ${transactionDt.toUTC()}.`);

      try {
        // Knows that exchange has been at timestamp.
        const usdCost = await this.binanceService.getTokenCurrencyCost('USD', transactionDt.toMillis());
        const eurCost = await this.binanceService.getTokenCurrencyCost('EUR', transactionDt.toMillis());

        try {
          // Create entity.
          const value = 0 + parseFloat(precisionFormat(transaction.value)) * (addr.addr === transaction.from ? -1 : 1);
          const entity: AddrHistoryEntity = this.addrHistoryRepository.create({
            addr,
            block: transaction.blockNumber,
            transaction: transaction.transactionIndex,
            transactionAt: transactionDt.toJSDate(),
            usd: usdCost * parseFloat(precisionFormat(transaction.value)),
            eur: eurCost * parseFloat(precisionFormat(transaction.value)),
            volume: value,
          } as AddrHistoryEntity);

          // Save entity.
          await this.addrHistoryRepository.save(entity);
          return true;
        } catch(error) {
          this.logger.error(`Error while save entity: ${error}`);
        }
      } catch(error) {
        this.logger.error(`Error while seek for exchange: ${error}`);
      }
    } catch(error) {
      this.logger.error(`Error while add transaction: ${error}`);
    }
    return false;
  }

  /**
   * Add list of transactions with target addrs.
   *
   * @private
   * @param {number} timestamp
   * @param {Transaction[]} transactions
   * @param {string[]} addrs
   * @returns {Promise<void>}
   *
   * @memberOf AppService
   */
  private async addTransactions(timestamp: number, transactions: Transaction[], addrs: string[]): Promise<void> {
    for (let transaction of transactions) {
      if (transaction.to) {
        const inAddrIndex = addrs.indexOf(transaction.to);
        if (-1 !== inAddrIndex) {
          const targetAddr = await this.addrRepository.findOneOrFail({ where: { addr: addrs[inAddrIndex] }});
          await this.addTransaction(timestamp, transaction, targetAddr);
        }
      }

      const outAddrIndex = addrs.indexOf(transaction.from);
      if (-1 !== outAddrIndex) {
        const targetAddr = await this.addrRepository.findOneOrFail({ where: { addr: addrs[outAddrIndex] }});
        await this.addTransaction(timestamp, transaction, targetAddr);
      }
    }
  }

  /**
   * Periodically sync blocks.
   *
   * @returns
   *
   * @memberOf AppService
   */
  @Interval('INTERVAL_HARVEST_TRANSACTIONS_SEC', INTERVAL_HARVEST_TRANSACTIONS_SEC)
  async harvestBalanceHistoryOfAddrs() {
    if (this.harvestingSemafor) return false;
    this.harvestingSemafor = true;

    try {
      const addrs: AddrEntity[] = await this.addrRepository.find();

      if (!addrs.length) {
        return false;
      }

      // Fetch current block number.
      const curBlockNumber = await this.web3.eth.getBlockNumber();

      // Seek target grouped addrs.
      const targets = addrs
        .filter((addr) => this.addrBlock.has(addr.addr) && curBlockNumber - (this.addrBlock.get(addr.addr) ?? 0))
        .reduce((r: any, addr: AddrEntity) => {
          const startBlock = this.addrBlock.get(addr.addr) ?? 0;
          if (!(startBlock in Object.keys(r))) {
            r[startBlock] = [];
          }
          r[startBlock].push(addr.addr);
          return r;
        }, {});

      const infuraOptions = this.configService.get<IInfuraOptions>(CONFIG_INFURA_OPTIONS_SERVICE_REGISTER_AS);
      for (const [ startBlock, addrs ] of Object.entries(targets as { v: string[] })) {
        const nextBlock = parseInt(startBlock) + (infuraOptions?.blocksPerInterval ?? 0);
        const endBlock = curBlockNumber < nextBlock ? curBlockNumber : nextBlock;

        try {
          const blocksWithTransactions = await this.ethService.getValuedTransactionsBatchRange(parseInt(startBlock), endBlock, addrs);
          try {
            const promises = blocksWithTransactions.map((block) => this.addTransactions(block.timestamp, block.transactions, addrs));
            await Promise.all(promises);
          } catch(error) {
            this.logger.error(`Error while add transactions: ${error}`);
          }
        } catch(error) {
          this.logger.error(`Error while seek valued transactions: ${error}`);
        }

        // Update end block for each addr in group.
        addrs.map((addr: string) => this.addrBlock.set(addr, endBlock + 1));
      }
    } catch(error) {
      this.logger.error(`Error while harvest valued transactions: ${error}`);
    }
    finally {
      this.harvestingSemafor = false;
    }
  }
}
